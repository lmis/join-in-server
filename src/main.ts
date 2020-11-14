import express from "express";
import bodyParser from "body-parser";
import socketIO, { Socket } from "socket.io";
import cors from "cors";

const port = 8000;

const server = express()
  .use(cors({ origin: /\.csb\.app$/ }))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .listen(port, () => console.log(`Listening on port ${port}`));

const socketIds = new Set<string>();
const maxNumberUsers = 20;
(socketIO as any)(server).on("connection", (socket: Socket) => {
  const { id } = socket;
  console.log(`Socket #${socketIds.size + 1} conntected. Id: ${id}`);
  if (socketIds.size === maxNumberUsers) {
    socket.emit("max-users-reached");
    socket.disconnect();
    return;
  } else {
    socket.emit("hello-client", { id });
  }

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
  socket.on("disconnect", () => {
    const { id } = socket;
    console.log(`Socket ${id} disconnected.`);
    socket.broadcast.emit("remove-user", {
      userId: id
    });
  });
});
