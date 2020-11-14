import express from "express";
import path from "path";
import bodyParser from "body-parser";

const port = 8000;

const app = express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "../", "public/error.html"));
  })
  .listen(port, () => console.log(`Listening on port ${port}`));
