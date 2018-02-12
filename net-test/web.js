(function () {
    var test = new WebSocket("ws://localhost:8081/");
    test.onopen = function (event) {
        test.send("Hi!");
    };

    var ready = false;
    var num = 0;
    test.onmessage = function (event) {
        if (!ready) {
            console.log("connection established!");
            ready = true;
            return
        }
        console.log(event.data);
        test.send("A message: " + ++num + "\n");
    };

})();
