core['CoffeeLiqueur`Extensions`NotebookDirectory`Private`SetKernelDirectory'] = async (args, env) => {
    const path = await interpretate(args[0], env);
    const event = await interpretate(args[1], env);

    window.addEventListener("focus", () => {
        if (!server.kernel)  {
            return;
        }
        if (server.kernel.socket.readyState != 1) {
            return;
        }
        server.kernel.io.fire(event, String(path));
    });

    let caller;
    
    caller = () => setTimeout(() => {
        if (!server.kernel) {
            caller();
            return;
        };
        if (server.kernel.socket.readyState != 1) {
            caller();
            return;
        }
        server.kernel.io.fire(event, String(path));
        caller = () => {};
    }, 300);

}