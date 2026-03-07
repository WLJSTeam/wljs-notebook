# Wolfram JS Frontend container
*contributed by [@yloose](https://github.com/yloose)*

## Description
A docker container for the [WLJS Notebook](https://github.com/JerryI/wolfram-js-frontend) project is provided here. The image is based on the on the [Wolfram Engine](https://hub.docker.com/r/wolframresearch/wolframengine) docker image to provide wolframscript.

### What is included:
- Node 18
- Clang + utils
- git
- ffmpeg
- curl

## Getting Started

1. Make sure you have either installed [docker](https://docs.docker.com/engine/install/) or [podman](https://podman.io/get-started) on your machine.

2. Register at the [Wolfram Engine download page](https://www.wolfram.com/engine/). Click to download (only needed to be redirected to the right place) and then follow the `Get your license` instructions. Register on the next page and acquire the license (it is free). A confirmation message will be sent to your email address. Please follow the link received by email.

3. Start the container (*not by a superuser!*):
    For example

```bash
docker run -it \
  -v ~/wljs:"/home/wljs/WLJS Notebooks" \
  -v ~/wljs/Licensing:/home/wljs/.WolframEngine/Licensing \
  -e PUID=$(id -u) \
  -e PGID=$(id -g) \
  -p 8080:3000 \
  --name wljs \
  ghcr.io/wljsteam/wljs-notebook:main
```

    You will now be prompted for your Wolfram login information, enter it and wait for the message `Open your browser at http://...`. You can now safely detach from the container using <kbd>Ctrl</kbd>+<kbd>p</kbd> <kbd>Ctrl</kbd>+<kbd>q</kbd> and close your terminal.

    !Note that a local folder (~/wljs) __folder will be mounted__ to the container.

    To start container again run

    ```bash
    docker start -ai wljs
    ```

4. Open a web browser at

        http://127.0.0.1:8080

You may change port mapping in the starting sequence.

## How to update
To feath a new version, you need to purge the old one including a named volume

```bash
docker stop wljs
docker rm wljs
docker system prune -a
```

And clear browser's cache as well.


## Features

The container is capable of following features:

- The container aggreggates the http and 2 websockets ports into one port
- An external working directory `~wljs` will be mounted inside the container default wljs notebooks directory.
- The container allows specifying the `PUID` and `PGID` environment variables to set the user id and group id of the user accessing the `/workspace` directory. Both default to 1000.
- A volume or bind mount can be used at `~/wljs/Licensing` inside the container to persist licensing information and `~/wljs/` as a user's default directory.
- To first activate the container you can either start it in interactive mode like shown in the Getting Started section or use environment variables. Use `WOLFRAMID_USERNAME` for the email belonging to the Wolfram Account and `WOLFRAMID_PASSWORD` for the corresponding password. The environment variables only have to be passed on first use. For example

```bash
docker run -it \
  -v ~/wljs:"/home/wljs/WLJS Notebooks" \
  -v ~/wljs/Licensing:/home/wljs/.WolframEngine/Licensing \
  -e PUID=$(id -u) \
  -e PGID=$(id -g) \
  -e WOLFRAMID_USERNAME=your@email.com \
  -e WOLFRAMID_PASSWORD=password \
  -p 8080:3000 \
  --name wljs \
  ghcr.io/wljsteam/wljs-notebook:main
```

## Running as root
*Not recommended*
Change the mounting directories

```bash
docker run -it \
  -v ~/wljs:"/root/WLJS Notebooks" \
  -v ~/wljs/Licensing:/root/.WolframEngine/Licensing \
  -e PUID=$(id -u) \
  -e PGID=$(id -g) \
  -p 8080:3000 \
  --name wljs \
  ghcr.io/wljsteam/wljs-notebook:main
```

## NGINX Proxy
The container also includes a nginx proxy running by default. This aggreggates the http and websockets ports into one port at 3000 (inside the container). It also makes it possible to further reverse proxy the application and add TLS encryption.

**Encrypted connection is mandatory** if WLJS Notebook is hosted on a remote server, otherwise some features will not work due to the restrictions of the unsequred context such as:
- Export to interactive HTML
- Audio/Video input
- Clipboard access

### TLS proxy config

To run the container behind a reverse proxy to add TLS support, a minimal nginx configuration similiar to this one could be used:

```
server {
    listen 80;
    server_name wljs.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name wljs.example.com;
    
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    set $upstream http://<container_host>:3000;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "keep-alive, upgrade";

        proxy_pass $upstream;
    }
}

```

Make sure to change port mapping from `80:3000` to `3000:3000` in the starting sequence if you start nginx TLS proxy outside the container

#### Note: if you do not have SSL certificate
It is still worth to use HTTPS with invalid certificate since you can always bypass all checks in any web browser. Here is an example of NGINX configuration:

*/etc/nginx/sites-enabled/default*
```                              
server {
    listen 80;
    server_name <YourDomainName>;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name <YourDomainName>;

    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem; 
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    set $upstream http://127.0.0.1:3000;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "keep-alive, upgrade";

        proxy_pass $upstream;
    }
}

```
where files `/etc/ssl/certs/ssl-cert-snakeoil.pem` do not exist.

Make sure to change port mapping from `80:3000` to `3000:3000` in the starting sequence.


### Basic Authentication
*We do recommend to set this if you plan to access it from the public IP*

1. Following [the guide](https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/) we install a simple util to generate login data

```bash
sudo apt install apache2-utils
```

then generate user and password

```bash
sudo htpasswd -c /etc/apache2/.htpasswd user1
```

2. Now set up NGIX proxy

```bash
nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80; 
    server_name mydomain.io;

    auth_basic           "WLJS Notebook";
    auth_basic_user_file /etc/apache2/.htpasswd;

    set $upstream http://127.0.0.1:3000;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "keep-alive, upgrade";

        proxy_pass $upstream;
    }
}
```

Restart nginx.

3. Set up the container

```bash
docker run -it \
  -v ~/wljs:"/home/wljs/WLJS Notebooks" \
  -v ~/wljs/Licensing:/home/wljs/.WolframEngine/Licensing \
  -e PUID=$(id -u) \
  -e PGID=$(id -g) \
  -p "127.0.0.1:3000:3000" \
  --name wljs \
  ghcr.io/wljsteam/wljs-notebook:main
```

