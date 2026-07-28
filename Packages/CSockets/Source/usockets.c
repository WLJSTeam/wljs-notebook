#undef UNICODE

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <uv.h>
#include <stdbool.h>


#include <stdint.h>

#include "WolframLibrary.h"
#include "WolframIOLibraryFunctions.h"
#include "WolframNumericArrayLibrary.h"

uv_loop_t *loop;

int uv_loop_running = -1;


#define MAXCLIENTS 5000

struct ooc
{
    uv_stream_t* stream;
    uv_stream_t* parent;
    //int type;
    int id;
    int state;

    struct sockaddr_in addr;
    mint asyncObjID;    
};

typedef struct ooc socketObject;
socketObject* sockets;
int nsockets = 0;

typedef enum {
    SOCKET_COMMAND_WRITE,
    SOCKET_COMMAND_CLOSE
} socket_command_type;

typedef struct write_req_s {
    uv_write_t req;
    uv_buf_t buf;
    uv_stream_t *stream;
    uv_handle_t *handle;
    socket_command_type type;
    struct write_req_s *next;
} write_req_t;

void free_write_req(uv_write_t *req) {
    write_req_t *wr = (write_req_t*) req;
    free(wr->buf.base);
    free(wr);
}

void alloc_buffer(uv_handle_t *handle, size_t suggested_size, uv_buf_t *buf) {
    buf->base = (char*) malloc(suggested_size);
    buf->len = suggested_size;
}

#define HASH_FREE -199
#define HASH_NEXT 33
#define HASH_OCCUPIED 71

typedef struct {
    uintptr_t stream;
    long id;

    int _flag;
} uState_t;

#define hashmap_size 16384
uState_t uState[hashmap_size];

uintptr_t hash(uintptr_t key, unsigned int offset) {
    if (offset > 32) {
        // Return a pseudo-random slot based on offset to avoid infinite recursion
        printf("hash >> warning: offset %d is large, using linear fallback\n", offset);
        uintptr_t knuth = 2654435769;
        return ((key * knuth + offset * 37) >> 16) % hashmap_size;
    }
    uintptr_t knuth = 2654435769;
    uintptr_t y = key;
    return ((y * knuth) >> (32 - offset)) % hashmap_size;
}

uintptr_t HashAllocate(uintptr_t socketId, int offset);

void HashCopy(uintptr_t socketId, int offsetSrc, int offsetDest) {
    if (offsetDest > 64) {
        printf("hash >> copy depth limit reached, skipping\n");
        return;
    }
    uintptr_t hS = hash((uintptr_t)socketId, offsetSrc);
    printf("hash >> allocate for a copy\n");
    uintptr_t hD = HashAllocate((uintptr_t)socketId, offsetDest);
    
    if (hD == (uintptr_t)-1) {
        printf("hash >> copy failed, no space\n");
        return;
    }

    printf("hash >> copied\n");

    memcpy(&uState[hD], &uState[hS], sizeof(uState_t));
}

//helper functions to check the status of the socket
uintptr_t HashAllocate(uintptr_t socketId, int offset) {
    if (offset > 64) {
        printf("hash >> allocation depth limit reached!\n");
        return (uintptr_t)-1;
    }
    
    printf("hash >> allocate %ld with offset %d\n", (uintptr_t)socketId, offset);
    uintptr_t h = hash((uintptr_t)socketId, offset);
    printf("hash >> %ld\n", h);

    if (uState[h]._flag == HASH_OCCUPIED) {
        // Don't try to copy if it's the same socket (avoid infinite loop)
        if (uState[h].stream == socketId) {
            printf("hash >> same socket already here, using next slot\n");
            return HashAllocate(socketId, offset + 1);
        }
        
        printf("hash >> collizion!\n");

        //copy the original value
        printf("hash >> copy old one %ld\n", (uintptr_t)uState[h].stream);
        HashCopy(uState[h].stream, offset, offset + 1);

        uState[h]._flag = HASH_NEXT;
        return HashAllocate(socketId, offset + 1);
    }

    if (uState[h]._flag == HASH_NEXT) {
        printf("hash >> next\n");
        return HashAllocate(socketId, offset + 1);
    }

    printf("hash >> ok!\n");
    uState[h]._flag = HASH_OCCUPIED;
    uState[h].stream = (uintptr_t)socketId;

    return h;
}

void HashInit() {
    for (int i=0; i<hashmap_size; ++i) {
        uState[i]._flag = HASH_FREE;
        uState[i].id = -1;
    }
}

void HashFree(uintptr_t socketId, int offset) {
    //printf("hash >> freeing %ld\n", (uintptr_t)socketId);
    if (offset > 32) {
        printf("hash >> free offset too big, giving up\n");
        return;
    }
    uintptr_t h = hash((uintptr_t)socketId, offset);
    if (uState[h]._flag == HASH_NEXT) {
        return HashFree(socketId, offset + 1);
    }

    if (uState[h]._flag == HASH_OCCUPIED && uState[h].stream == socketId) {
        uState[h]._flag = HASH_FREE;
        return;
    }

    //printf("hash >> already freed!\n");
}

uintptr_t HashGet(uintptr_t socketId, int offset) {
    //printf("[HashGet] get\r\n\r\n");
    if (offset > 64) {
        printf("[HashGet] offset too large, giving up\r\n");
        return (uintptr_t)-1;
    }
    uintptr_t h = hash((uintptr_t)socketId, offset);
    if (uState[h]._flag == HASH_NEXT) {
        //printf("[HashGet] next\r\n\r\n");
        return HashGet(socketId, offset + 1);
    }
    //printf("[HashGet] done\r\n\r\n");

    return h;
}


void uStateSet(uintptr_t socketId, int state) {
    uintptr_t h = HashGet(socketId, 0);
    if (h == (uintptr_t)-1) {
        printf("[uStateSet] hash lookup failed\r\n\r\n");
        return;
    }
    if ((uintptr_t)(uState[h].stream) != (uintptr_t)socketId || uState[h]._flag == HASH_FREE) {
        printf("[uGetState] probably it is gone already\r\n\r\n");
        return;
    }
    uState[h].id = state;
}

int fetchByStreamId(uv_stream_t *client) {
    uintptr_t h = HashGet((uintptr_t)client, 0);
    if (h == (uintptr_t)-1) {
        return -1;
    }
    if ((uintptr_t)(uState[h].stream) != (uintptr_t)client) {
        return -1;
    }
    return uState[h].id;
}


WolframIOLibrary_Functions ioLibrary;
WolframNumericArrayLibrary_Functions numericLibrary;
mint asyncObjID;


uv_mutex_t mutex;

typedef struct SocketTaskArgs_st {
    WolframNumericArrayLibrary_Functions numericLibrary;
    WolframIOLibrary_Functions ioLibrary;
    mint garbage; 
}* SocketTaskArgs; 

DLLEXPORT mint WolframLibrary_getVersion( ) {
    return WolframLibraryVersion;
}

DLLEXPORT int WolframLibrary_initialize(WolframLibraryData libData) {


    uv_mutex_init(&mutex);

    sockets = (socketObject*)malloc(sizeof(socketObject)*MAXCLIENTS);
    for (int i=0; i<MAXCLIENTS; ++i) sockets[i].state = -1; //all closed

    nsockets = 0;

    loop = uv_default_loop();
    

    ioLibrary = libData->ioLibraryFunctions;
    numericLibrary = libData->numericarrayLibraryFunctions;

    HashInit();

    return 0;
}

DLLEXPORT void WolframLibrary_uninitialize(WolframLibraryData libData) {
    uv_stop(loop);

    return;
}

void pipeBufData (uv_buf_t buf, uv_stream_t *client) {
    int clientId = fetchByStreamId(client);
    if (clientId < 0) {
        printf("socket is broken!\r\n");
        return;
    }

    //unusual case, when you connected to a remote server and also listeering 
    int streamId = fetchByStreamId(sockets[clientId].parent);

    mint dims[1]; 
    MNumericArray data;

	DataStore ds;

    //printf("CURRENT ID OF CLIENT: %d\n", clientId);

    //printf("RECEIVED %d BYTES\n", buf.len);
    
    dims[0] = buf.len; 
    numericLibrary->MNumericArray_new(MNumericArray_Type_UBit8, 1, dims, &data); 
    memcpy(numericLibrary->MNumericArray_getData(data), buf.base, buf.len);
                
    ds = ioLibrary->createDataStore();
    ioLibrary->DataStore_addInteger(ds, streamId);
    ioLibrary->DataStore_addInteger(ds, clientId);
    ioLibrary->DataStore_addMNumericArray(ds, data);

    //printf("raise async event %d for server %d and client %d\n", asyncObjID, streamId, clientId);
    ioLibrary->raiseAsyncEvent(asyncObjID, "Received", ds);
}

//#define broadcastState(a, Msg) broadcastState(a, Msg, 0)



void broadcastState (int clientId, const char *state, int data) {
    int streamId = fetchByStreamId(sockets[clientId].parent);

    printf("broadcast %s state!\n", state);
	DataStore ds;

    ds = ioLibrary->createDataStore();
    
    ioLibrary->DataStore_addInteger(ds, streamId);
    ioLibrary->DataStore_addInteger(ds, clientId);
    ioLibrary->DataStore_addInteger(ds, data);
    

    //printf("raise async event %d for server %d and client %d\n", asyncObjID, streamId, clientId);
    ioLibrary->raiseAsyncEvent(asyncObjID, state, ds);
}


void echo_read(uv_stream_t *client, ssize_t nread, const uv_buf_t *buf) {
    //printf("echo read\n");
    if (nread > 0) {
        uv_buf_t b = uv_buf_init(buf->base, nread);
        pipeBufData(b, client);
        free(b.base);   
        return;
    }

    if (nread < 0) {
        if (nread != UV_EOF)
            fprintf(stderr, "Read error %s\n", uv_err_name(nread));

        //uv_close((uv_handle_t*) client, NULL);
        int uid = fetchByStreamId(client);
        if (uid < 0) {
            printf("socket is broken!\r\n");
            free(buf->base);
            return;
        }
        printf("writeerror !\n");
        printf("making %d closed by the reading thread!\n", uid);
        if (uv_is_closing((uv_handle_t*) sockets[uid].stream) == 0) {
            broadcastState(uid, "Closed", 0);
            uv_close((uv_handle_t*) sockets[uid].stream, NULL);
        }
        sockets[uid].state = -1;   
        
        //broadcastState(uid);

        uStateSet((uintptr_t)sockets[uid].stream, -1);
        HashFree((uintptr_t)sockets[uid].stream, 0);

        //printf("we closed socket: %d ;)))\n", fetchByStreamId(client));
        //sockets[fetchByStreamId(client)].state = 2;
        //mb one can notify mathematica about it
    }

    free(buf->base);
}

bool _force_reuse = false;

void findEmptySocketSlot() {
    if (!_force_reuse) {
        nsockets++;
        if (nsockets == MAXCLIENTS) {
            printf("sorry i will probably die now. please, blame krikus.ms@gmail.com\n");
            nsockets = 0;
            _force_reuse = true;
        }
        return;
    }
    if (sockets[nsockets].state == -1) return;
    nsockets++;
    
    if (nsockets == MAXCLIENTS) nsockets = 0;

    while(true) {
        if (sockets[nsockets].state == -1) return;

        nsockets++;
        if (nsockets == MAXCLIENTS) nsockets = 0;
    }
    
}



void on_new_connection(uv_stream_t *server, int status) {
    
    if (status < 0) {
        fprintf(stderr, "New connection error %s\n", uv_strerror(status));
        // error!
        return;
    }

    findEmptySocketSlot();

    printf("New connection for %d\n", nsockets);

    uv_tcp_t *c = (uv_tcp_t*) malloc(sizeof(uv_tcp_t));

    
    //hash_table_occupy((uv_stream_t*)c, nsockets);
    uintptr_t hResult = HashAllocate((uintptr_t)c, 0);
    if (hResult == (uintptr_t)-1) {
        fprintf(stderr, "Hash table full, rejecting connection\n");
        free(c);
        return;
    }
    uStateSet((uintptr_t)c, nsockets);

    sockets[nsockets].stream = (uv_stream_t*)c;
    sockets[nsockets].parent = (uv_stream_t*)server;
    sockets[nsockets].id = nsockets;
    sockets[nsockets].state = 0;
    //sockets[nsockets].type = 1;

    uv_tcp_init(loop, c);

    if (uv_accept(server, (uv_stream_t*) c) == 0) {
        printf("uv start reading");
        sockets[nsockets].state = 1;

        struct sockaddr_storage addr;
	    memset(&addr, 0, sizeof(addr));
	    int alen;
	    int r = uv_tcp_getpeername((uv_stream_t*) c, (struct sockaddr *)&addr, &alen);

        //uv_tcp_getsockname((uv_handle_t*)sockets[nsockets].stream, &(sockets[nsockets].addr), sizeof((sockets[nsockets].addr)));
        
        if (r == 0) {
            int connect_port = ntohs(((struct sockaddr_in*) &(sockets[nsockets].addr))->sin_port);
            broadcastState(nsockets, "NewClient", connect_port);
        } else {
            broadcastState(nsockets, "NewClient", -1);
        }

        uv_read_start((uv_stream_t*) c, alloc_buffer, echo_read);
    } else {
        printf("not accepted for %d", nsockets);
        sockets[nsockets].state = -1;
        if (uv_is_closing((uv_handle_t*) c) == 0) {
            broadcastState(nsockets, "Closed", 0);
            uv_close((uv_handle_t*) c, NULL);
        }
        //hash_table_deoccupy((uintptr_t)c);  
        uStateSet((uintptr_t)c, -1);
        HashFree((uintptr_t)c, 0);
    }
}

uv_async_t cbio;


void async_cb_io(uv_async_t* async);

static void uvTask(mint asyncObjID, void* vtarg)
{
    fprintf(stderr, "\nHee uvTask: %lld\n", asyncObjID);
    printf("Event-Loop started! \n");
    uv_async_init(loop, &cbio, async_cb_io);
    uv_run(loop, UV_RUN_DEFAULT);
}


DLLEXPORT int run_uvloop(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res) {
    printf("creating async task...\n");
    SocketTaskArgs threadArg = (SocketTaskArgs)malloc(sizeof(struct SocketTaskArgs_st));
    threadArg->ioLibrary = libData->ioLibraryFunctions; 
    threadArg->numericLibrary = libData->numericarrayLibraryFunctions;
    ioLibrary = libData->ioLibraryFunctions;
    numericLibrary = libData->numericarrayLibraryFunctions;
    
        
    asyncObjID = ioLibrary->createAsynchronousTaskWithThread(uvTask, threadArg);

    MArgument_setInteger(Res, asyncObjID); 
    return LIBRARY_NO_ERROR;     
}

DLLEXPORT int socket_open(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res) {
    char* listenAddrName = MArgument_getUTF8String(Args[0]); 
    char* listenPortName = MArgument_getUTF8String(Args[1]); 
  
    //loop = uv_default_loop();

    uv_tcp_t* s = (uv_tcp_t*)malloc(sizeof(uv_tcp_t));

    uv_mutex_lock(&mutex);
    findEmptySocketSlot();

    //hash_table_occupy((uv_stream_t*)s, nservers);
    uintptr_t hResult = HashAllocate((uintptr_t)s, 0);
    if (hResult == (uintptr_t)-1) {
        fprintf(stderr, "Hash table full in socket_open\n");
        uv_mutex_unlock(&mutex);
        free(s);
        MArgument_setInteger(Res, -1);
        return LIBRARY_NO_ERROR;
    }
    uStateSet((uintptr_t)s, nsockets);

    sockets[nsockets].stream = (uv_stream_t*)s;
    sockets[nsockets].id = nsockets;
    sockets[nsockets].state = 0;
   // sockets[nsockets].type = 0;

    printf("opened on socket %d\n", nsockets);


    uv_tcp_init(loop, s);

    uv_ip4_addr(listenAddrName, atoi(listenPortName), &(sockets[nsockets].addr));
    

    MArgument_setInteger(Res, nsockets); 

    uv_mutex_unlock(&mutex);

    return LIBRARY_NO_ERROR;
}

DLLEXPORT int create_server(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res) 
{
    int clientId = MArgument_getInteger(Args[0]); 

    sockets[clientId].parent = sockets[clientId].stream;

    uv_tcp_bind((uv_stream_t*) sockets[clientId].stream, (const struct sockaddr*)&(sockets[clientId].addr), 0);
    int r = uv_listen((uv_stream_t*) sockets[clientId].stream, 128, on_new_connection);
    if (r) {
        fprintf(stderr, "Listen error %s\n", uv_strerror(r));
        MArgument_setInteger(Res, -1); 
        return LIBRARY_NO_ERROR;
    }

    sockets[clientId].state = 1;

    printf("LISTEN uintptr_t at %d\n", clientId); 

    //MArgument_setInteger(Res, nservers); 

    sockets[clientId].asyncObjID = clientId;

    printf("server: %d\n", clientId); 

    MArgument_setInteger(Res, clientId); 

    return LIBRARY_NO_ERROR; 
}

#define MAX_PENDING_WRITE_REQUESTS ((size_t)65536)
#define MAX_PENDING_WRITE_BYTES ((size_t)512 * 1024 * 1024)

static write_req_t *command_head = NULL;
static write_req_t *command_tail = NULL;
static size_t pending_write_requests = 0;
static size_t pending_write_bytes = 0;

static void finish_write_req(write_req_t *req) {
    uv_mutex_lock(&mutex);
    if (pending_write_requests > 0) {
        --pending_write_requests;
    }
    if (pending_write_bytes >= req->buf.len) {
        pending_write_bytes -= req->buf.len;
    } else {
        pending_write_bytes = 0;
    }
    uv_mutex_unlock(&mutex);

    free_write_req(&req->req);
}

static void mark_stream_failed(uv_stream_t *stream, int status) {
    int uid = fetchByStreamId(stream);
    if (uid < 0) {
        printf("client hash is broken\r\n");
        return;
    }

    fprintf(stderr, "write error on socket %d: %s\n", uid, uv_strerror(status));
    if (uv_is_closing((uv_handle_t*) sockets[uid].stream) == 0) {
        broadcastState(uid, "Closed", 0);
        uv_close((uv_handle_t*) sockets[uid].stream, NULL);
    }
    sockets[uid].state = -1;
    uStateSet((uintptr_t)sockets[uid].stream, -1);
    HashFree((uintptr_t)sockets[uid].stream, 0);
}

void echo_write(uv_write_t *uv_req, int status) {
    write_req_t *req = (write_req_t*) uv_req;

    if (status < 0) {
        mark_stream_failed(req->stream, status);
    }

    finish_write_req(req);
}

static int enqueue_command(write_req_t *command) {
    write_req_t *previous_tail;
    size_t queued_requests;
    size_t queued_bytes;
    int result;

    uv_mutex_lock(&mutex);

    if (command->type == SOCKET_COMMAND_WRITE) {
        if (pending_write_requests >= MAX_PENDING_WRITE_REQUESTS ||
            command->buf.len > MAX_PENDING_WRITE_BYTES - pending_write_bytes) {
            queued_requests = pending_write_requests;
            queued_bytes = pending_write_bytes;
            uv_mutex_unlock(&mutex);
            fprintf(
                stderr,
                "socket write queue full: %zu requests, %zu bytes pending\n",
                queued_requests,
                queued_bytes
            );
            return UV_ENOBUFS;
        }

        ++pending_write_requests;
        pending_write_bytes += command->buf.len;
    }

    previous_tail = command_tail;
    if (command_tail != NULL) {
        command_tail->next = command;
    } else {
        command_head = command;
    }
    command_tail = command;

    /*
     * Keep the queue locked until uv_async_send succeeds. This lets us roll
     * back this exact append safely if the async handle is already closing.
     */
    result = uv_async_send(&cbio);
    if (result < 0) {
        if (previous_tail != NULL) {
            previous_tail->next = NULL;
            command_tail = previous_tail;
        } else {
            command_head = NULL;
            command_tail = NULL;
        }

        if (command->type == SOCKET_COMMAND_WRITE) {
            --pending_write_requests;
            pending_write_bytes -= command->buf.len;
        }
    }

    uv_mutex_unlock(&mutex);
    return result;
}

static write_req_t *take_pending_commands(void) {
    write_req_t *commands;

    uv_mutex_lock(&mutex);
    commands = command_head;
    command_head = NULL;
    command_tail = NULL;
    uv_mutex_unlock(&mutex);

    return commands;
}

void async_cb_io(uv_async_t* async) {
    write_req_t *command;

    (void)async;

    /*
     * New producers may append while libuv processes this detached list.
     * Looping also handles uv_async_send coalescing without losing a wakeup.
     */
    while ((command = take_pending_commands()) != NULL) {
        while (command != NULL) {
            write_req_t *next = command->next;
            command->next = NULL;

            if (command->type == SOCKET_COMMAND_CLOSE) {
                if (command->handle != NULL &&
                    uv_is_closing(command->handle) == 0) {
                    uv_close(command->handle, NULL);
                }
                free(command);
            } else {
                int result = uv_write(
                    &command->req,
                    command->stream,
                    &command->buf,
                    1,
                    echo_write
                );

                /*
                 * libuv does not run echo_write after an immediate uv_write
                 * failure, so release ownership and account for it here.
                 */
                if (result < 0) {
                    mark_stream_failed(command->stream, result);
                    finish_write_req(command);
                }
            }

            command = next;
        }
    }
}

static int uv_write_push(write_req_t *req, uv_stream_t* stream) {
    req->type = SOCKET_COMMAND_WRITE;
    req->stream = stream;
    req->handle = NULL;
    req->next = NULL;
    return enqueue_command(req);
}

static int uv_close_push(uv_handle_t* handle) {
    write_req_t *command = (write_req_t*) calloc(1, sizeof(write_req_t));
    int result;

    if (command == NULL) {
        return UV_ENOMEM;
    }

    command->type = SOCKET_COMMAND_CLOSE;
    command->handle = handle;
    result = enqueue_command(command);

    if (result < 0) {
        free(command);
    }

    return result;
}



DLLEXPORT int socket_write(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res){
    WolframNumericArrayLibrary_Functions numericLibrary = libData->numericarrayLibraryFunctions; 
    int clientId = MArgument_getInteger(Args[0]); 

    if (sockets[clientId].state == -1) {
        printf("Client %d is closed already!\n", clientId);
        MArgument_setInteger(Res, -1);
        return LIBRARY_NO_ERROR;
    }    

    if (uv_is_writable(sockets[clientId].stream) == 0) {
        int closeResult = 0;

        printf("Client %d is not writtable anymore!\n", clientId);
        if (uv_is_closing((uv_handle_t*) sockets[clientId].stream) == 0) {
            closeResult = uv_close_push((uv_handle_t*) sockets[clientId].stream);
        }

        broadcastState(clientId, "Closed",0);

        uStateSet((uintptr_t)sockets[clientId].stream, -1);
        HashFree((uintptr_t)sockets[clientId].stream, 0);
 
        sockets[clientId].state = -1;
        MArgument_setInteger(Res, closeResult < 0 ? closeResult : UV_EPIPE);
        return LIBRARY_NO_ERROR;
    }

          
    mint bytesLen = MArgument_getInteger(Args[2]);
    if (bytesLen < 0) {
        MArgument_setInteger(Res, UV_EINVAL);
        return LIBRARY_NO_ERROR;
    }

    write_req_t *req = (write_req_t*) calloc(1, sizeof(write_req_t));
    if (req == NULL) {
        MArgument_setInteger(Res, UV_ENOMEM);
        return LIBRARY_NO_ERROR;
    }

    if (bytesLen > 0) {
        req->buf.base = (char*) malloc((size_t)bytesLen);
        if (req->buf.base == NULL) {
            free(req);
            MArgument_setInteger(Res, UV_ENOMEM);
            return LIBRARY_NO_ERROR;
        }

        /*
         * Keep a private copy until echo_write runs; Wolfram may release its
         * ByteArray immediately after this LibraryLink call returns.
         */
        memcpy(
            req->buf.base,
            numericLibrary->MNumericArray_getData(MArgument_getMNumericArray(Args[1])),
            (size_t)bytesLen
        );
    }
    req->buf.len = (size_t)bytesLen;

    int st = uv_write_push(req, sockets[clientId].stream);
    if (st < 0) {
        free_write_req(&req->req);
    }

    MArgument_setInteger(Res, st); 
    return LIBRARY_NO_ERROR; 
}



DLLEXPORT int socket_write_string(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res){
    int clientId = MArgument_getInteger(Args[0]); 

    if (sockets[clientId].state == -1) {
        printf("Client %d is closed already!\n", clientId);
        MArgument_setInteger(Res, -1);
        return LIBRARY_NO_ERROR;
    }    

    if (uv_is_writable(sockets[clientId].stream) == 0) {
        int closeResult = 0;

        printf("Client %d is not writtable anymore!\n", clientId);
        if (uv_is_closing((uv_handle_t*) sockets[clientId].stream) == 0) {
            closeResult = uv_close_push((uv_handle_t*) sockets[clientId].stream);
        }

        broadcastState(clientId, "Closed",0);
        uStateSet((uintptr_t)sockets[clientId].stream, -1);
        HashFree((uintptr_t)sockets[clientId].stream, 0);

        sockets[clientId].state = -1;
        MArgument_setInteger(Res, closeResult < 0 ? closeResult : UV_EPIPE);
        return LIBRARY_NO_ERROR;
    }

    mint bytesLen = MArgument_getInteger(Args[2]);
    if (bytesLen < 0) {
        MArgument_setInteger(Res, UV_EINVAL);
        return LIBRARY_NO_ERROR;
    }

    write_req_t *req = (write_req_t*) calloc(1, sizeof(write_req_t));
    if (req == NULL) {
        MArgument_setInteger(Res, UV_ENOMEM);
        return LIBRARY_NO_ERROR;
    }

    if (bytesLen > 0) {
        req->buf.base = (char*) malloc((size_t)bytesLen);
        if (req->buf.base == NULL) {
            free(req);
            MArgument_setInteger(Res, UV_ENOMEM);
            return LIBRARY_NO_ERROR;
        }

        /*
         * Keep a private copy until echo_write runs; Wolfram may release its
         * UTF-8 string immediately after this LibraryLink call returns.
         */
        memcpy(req->buf.base, MArgument_getUTF8String(Args[1]), (size_t)bytesLen);
    }
    req->buf.len = (size_t)bytesLen;

    int st = uv_write_push(req, sockets[clientId].stream);
    if (st < 0) {
        free_write_req(&req->req);
    }

    MArgument_setInteger(Res, st); 
    return LIBRARY_NO_ERROR; 
}

DLLEXPORT int close_socket(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res){
    int clientId = MArgument_getInteger(Args[0]); 

    printf("Client %d was closed by Wolfram!\n", clientId);
    if (uv_is_closing((uv_handle_t*) sockets[clientId].stream) == 0) {
        int closeResult = uv_close_push((uv_handle_t*) sockets[clientId].stream);
        if (closeResult < 0) {
            MArgument_setInteger(Res, closeResult);
            return LIBRARY_NO_ERROR;
        }
    }
    broadcastState(clientId, "Closed",0);
    sockets[clientId].state = -1;  

    uStateSet((uintptr_t)sockets[clientId].stream, -1);
    HashFree((uintptr_t)sockets[clientId].stream, 0);   
    
    MArgument_setInteger(Res, 0);
    return LIBRARY_NO_ERROR; 
}

DLLEXPORT int stop_server(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res){
    //exit(-1);
    //MArgument_setInteger(Res, libData->ioLibraryFunctions->removeAsynchronousTask(taskId)); 

    //sorry you cant. you can only close listerning socket
    return LIBRARY_NO_ERROR; 
}  




void on_connect(uv_connect_t * req, int status) {
    if (status == -1) {
        fprintf(stderr, "error on_write_end");
        return;
    }
    printf("Connected! \n");

    int uid = fetchByStreamId(req->handle);
    sockets[uid].state = 1;
    //exit(-1);
    //uv_stream_t *tcp = req->handle;
    broadcastState(uid, "Connected", 0);
    uv_read_start(req->handle, alloc_buffer, echo_read);
/*char buffer[100];
    uv_buf_t buf = uv_buf_init(buffer, sizeof(buffer));
    char *message = "hello";
    buf.len = strlen(message);
    buf.base = message;
    uv_stream_t *tcp = req->handle;
    uv_write_t write_req;
    int buf_count = 1;
    uv_write(&write_req, tcp, &buf, buf_count, NULL);    */
}

DLLEXPORT int socket_connect(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res) 
{
    int clientId = MArgument_getInteger(Args[0]);
    sockets[clientId].parent = sockets[clientId].stream;
    //usleep(5);
    uv_connect_t* connect = (uv_connect_t*)malloc(sizeof(uv_connect_t));
    uv_tcp_connect(connect, (uv_stream_t*) sockets[clientId].stream, (const struct sockaddr*)(&sockets[clientId].addr), on_connect);
    printf("connecting via %d\n", clientId);
    

    MArgument_setInteger(Res, clientId); 

    return LIBRARY_NO_ERROR; 
}

//not thread safe!!!
/*DLLEXPORT int get_socket_state(WolframLibraryData libData, mint Argc, MArgument *Args, MArgument Res) 
{
    printf('get state');
    //usleep(5);
    int id = MArgument_getInteger(Args[0]); 
    
    uv_mutex_lock(&mutex);
    MArgument_setInteger(Res, sockets[id].state);
    uv_mutex_unlock(&mutex);
     return LIBRARY_NO_ERROR;
}*/

    
