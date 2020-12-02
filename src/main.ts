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

enum Signal {
  _CONNECTION = "connection",
  _DISCONNECT = "disconnect",
  HELLO_CLIENT = "hello-client",
  MAX_USERS_REACHED = "max-users-reached",
  USER_JOINED = "user-joined",
  MOVEMENT_UPDATE = "movement-update",
  USER_LEFT = "user-left",
  ICE_CANDIDATE = "ice-candidate",
  CONNECTION_OFFER = "connection-offer",
  CONNECTION_ANSWER = "connection-answer"
}

const logEvent = (id: string, signal: Signal, payload?: any): void => {
  console.log(
    `${id}: ${signal} ${payload ? `(${JSON.stringify(payload)})` : ""}`
  );
};

const maxNumberUsers = 20;
const io = (socketIO as any)(server) as Server;
io.on(Signal._CONNECTION, (socket: Socket) => {
  const { id } = socket;
  const socketIds = [...io.sockets.sockets.values()]
    .map((s) => s.id)
    .filter((i) => i !== id);
  const numberOfSockets = socketIds.length;

  logEvent(id, Signal._CONNECTION, "#" + numberOfSockets);
  if (numberOfSockets === maxNumberUsers) {
    socket.emit(Signal.MAX_USERS_REACHED);
    socket.disconnect();
    return;
  }

  socket.emit(Signal.HELLO_CLIENT, { userIds: socketIds });
  socket.broadcast.emit(Signal.USER_JOINED, {
    userId: id
  });

  const receive = <T extends object | undefined>(
    signal: Signal,
    handler: (payload: T) => void,
    silent: boolean = false
  ) => {
    socket.on(signal, (payload) => {
      if (!silent) {
        logEvent(id, signal, payload);
      }
      handler(payload);
    });
  };

  receive(Signal._DISCONNECT, () => {
    socket.broadcast.emit(Signal.USER_LEFT, {
      userId: id
    });
  });

  receive<{ target: string; candidate: any }>(
    Signal.ICE_CANDIDATE,
    ({ target, candidate }) => {
      io.to(target).emit(Signal.ICE_CANDIDATE, {
        userId: id,
        candidate
      });
    }
  );

  receive<{ target: string; offer: any }>(
    Signal.CONNECTION_OFFER,
    ({ target, offer }) => {
      socket.to(target).emit(Signal.CONNECTION_OFFER, {
        userId: id,
        offer
      });
    }
  );

  receive<{ target: string; answer: any }>(
    Signal.CONNECTION_ANSWER,
    ({ target, answer }) => {
      socket.to(target).emit(Signal.CONNECTION_ANSWER, {
        userId: id,
        answer
      });
    }
  );

  receive<{
    movement: { position: [number, number]; angle: number; speed: number };
  }>(Signal.MOVEMENT_UPDATE, ({ movement }) => {
    socket.broadcast.emit(Signal.MOVEMENT_UPDATE, {
      userId: id,
      movement
    });
  });
});
