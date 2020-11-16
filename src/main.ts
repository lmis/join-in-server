import express from "express";
import bodyParser from "body-parser";
import socketIO, { Socket, Server } from "socket.io";
import cors from "cors";

const port = 8000;

const server = express()
  .use(cors({ origin: /\.csb\.app$/ }))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .listen(port, () => console.log(`Listening on port ${port}`));

enum Signals {
  _CONNECTION = "connection",
  _DISCONNECT = "disconnect",
  HELLO_CLIENT = "hello-client",
  MAX_USERS_REACHED = "max-users-reached",
  USER_JOINED = "user-joined",
  POSITION_UPDATE = "position-update",
  USER_LEFT = "user-left",
  ICE_CANDIDATE = "ice-candidate",
  CONNECTION_OFFER = "connection-offer",
  CONNECTION_ANSWER = "connection-answer"
}

const logEvent = (id: string, signal: Signals, payload?: any): void => {
  console.log(
    `${id}: ${signal} ${payload ? `(${JSON.stringify(payload)})` : ""}`
  );
};

const maxNumberUsers = 20;
const io = (socketIO as any)(server) as Server;
io.on(Signals._CONNECTION, (socket: Socket) => {
  const { id } = socket;
  const socketIds = [...io.sockets.sockets.values()]
    .map((s) => s.id)
    .filter((i) => i !== id);
  const numberOfSockets = socketIds.length;

  logEvent(id, Signals._CONNECTION, "#" + numberOfSockets);
  if (numberOfSockets === maxNumberUsers) {
    socket.emit(Signals.MAX_USERS_REACHED);
    socket.disconnect();
    return;
  }

  socket.emit(Signals.HELLO_CLIENT, { id, userIds: socketIds });
  socket.broadcast.emit(Signals.USER_JOINED, {
    userId: id
  });

  socket
    .on(Signals._DISCONNECT, () => {
      logEvent(id, Signals._DISCONNECT);
      socket.broadcast.emit(Signals.USER_LEFT, {
        userId: id
      });
    })
    .on(
      Signals.ICE_CANDIDATE,
      (payload: { target: string; candidate: any }) => {
        logEvent(id, Signals.ICE_CANDIDATE, payload);
        io.to(payload.target).emit(Signals.ICE_CANDIDATE, {
          userId: id,
          candidate: payload.candidate
        });
      }
    )
    .on(Signals.CONNECTION_OFFER, (payload: { target: string; offer: any }) => {
      logEvent(id, Signals.CONNECTION_OFFER, payload);
      socket.to(payload.target).emit(Signals.CONNECTION_OFFER, {
        userId: id,
        offer: payload.offer
      });
    })
    .on(
      Signals.CONNECTION_ANSWER,
      (payload: { target: string; answer: any }) => {
        logEvent(id, Signals.CONNECTION_ANSWER, payload);
        socket.to(payload.target).emit(Signals.CONNECTION_ANSWER, {
          userId: id,
          answer: payload.answer
        });
      }
    )
    .on(
      Signals.POSITION_UPDATE,
      (payload: { target: string; position: [number, number] }) => {
        logEvent(id, Signals.POSITION_UPDATE, payload);
        socket.to(payload.target).emit(Signals.POSITION_UPDATE, {
          userId: id,
          position: payload.position
        });
      }
    );
});
