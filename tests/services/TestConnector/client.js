// Success
process.stdin.resume();
process.stdin.on("data", function(data) {
    process.stdout.write(data);
});
setTimeout(function() {
    process.exit(0);
}, 500);
