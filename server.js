const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

//set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "BotName";

//run when user is connects
io.on("connection", (socket) => {
  socket.on("joinRoom", async ({ username, room }) => {
    const user = await userJoin(socket.id, username, room);
    socket.join(user.room);

    //welcome when current user connects
    await socket.emit(
      "message",
      formatMessage(botName, "welcome to ChatRoom !")
    );

    //Broadcast to everyone
    await socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has join the ChatRoom !`)
      );

    //Send users and room info
    await io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  //Listen for chat message
  socket.on("chatMessage", async (msg) => {
    const user = await getCurrentUser(socket.id);
    await io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  //run when user disconnect
  socket.on("disconnect", async () => {
    const user = await userLeave(socket.id);
    if (user) {
      await io
        .to(user.room)
        .emit(
          "message",
          formatMessage(botName, `${user.username} has left the ChatRoom`)
        );
    }
    //Send users and room info
    await io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`server running on port ${PORT} ! `));
