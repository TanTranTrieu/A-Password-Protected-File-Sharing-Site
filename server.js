"use strict";
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const upload = multer({ dest: "uploads/" });
const bcrypt = require("bcrypt");
const File = require("./model/File");
const app = express();
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.DATABASE_URL);

app.set("view engine", "ejs");

async function listOfDocuments(req, res, next) {
  const listOfDocs = await File.find();
  console.log(listOfDocs.length);
  console.log("listOfDocuments() is called");
  next();
  //return listOfDocs;
}

var _paths = [];

//app.use(listOfDocuments);

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
    password: "",
  };

  console.log(req.body);
  if (req.body.password != null && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }

  const file = await File.create(fileData);
  //res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` });
  res.render("downloads");
});



app.get("/downloads", async (req, res) => {
  const downloadLinks = await File.find();
  const paths = [];
  downloadLinks.forEach((element) => {
    return paths.push(`/file/${element._id}`);
  });

  if (paths.length === 0) {
    res.send("There is no file to download");
    return;
  }
  _paths = paths;
  res.render("downloads", { downloadLinks: paths });
});

// app.route("/file/:id").get(handleDownload).post(handleDownload);
//app.get("/file/:id", handleDownload);

app.post("/file/:id", handleDownload);
async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  let incorrectPassword = {
    id: req.params.id,
    matching: false,
  };

  if (file.password != null) {
    if (req.body.password == null) {
      res.render("downloads");
      return;
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("downloads", {
        error: true,
        downloadLinks: _paths,
        incorrectPassword: incorrectPassword,
      });
      return;
    }
  }

  file.downloadCount++;
  await file.save();
  res.download(file.path, file.originalName);
}

app.listen(process.env.PORT);
