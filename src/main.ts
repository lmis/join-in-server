import express from "express";
import path from "path";
import bodyParser from "body-parser";
import socketIO, { Socket } from "socket.io";

const port = 8000;

const server = express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "../", "public/error.html"));
  })
  .listen(port, () => console.log(`Listening on port ${port}`));

const socketIds = new Set<string>();
socketIO(server)
  .on("connection", (socket: Socket) => {
    const { id } = socket;
    console.log("Socket connected", JSON.stringify(socket));

    if (!socketIds.has(id)) {
      const userIds: string[] = [...socketIds];
      socket.broadcast.emit("add-users", {
        userIds: [socket.id]
      });
      socket.emit("add-users", {
        userIds
      });
      socketIds.add(id);
    }
  })
  .on("disconnect", (socket: Socket) => {
    const { id } = socket;
    console.log("Socket disconnected", JSON.stringify(socket));
    socket.broadcast.emit("remove-user", {
      userId: id
    });
  });
