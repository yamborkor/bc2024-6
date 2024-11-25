const express = require("express");
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const program = new Command();
program
  .requiredOption("-h, --host <host>", "адреса сервера")
  .requiredOption("-p, --port <port>", "порт сервера")
  .requiredOption("-c, --cache <cache>", "шлях до директорії для кешу")
  .parse(process.argv);

const options = program.opts();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer();

const cacheDir = path.resolve(options.cache);
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

app.get("/notes/:name", (req, res) => {
  const notePath = path.join(cacheDir, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send("Not found");
  }
  const noteText = fs.readFileSync(notePath, "utf-8");
  res.send(noteText);
});

app.put("/notes/:name", (req, res) => {
  const notePath = path.join(cacheDir, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send("Not found");
  }
  fs.writeFileSync(notePath, req.body.text || "");
  res.sendStatus(200);
});

app.delete("/notes/:name", (req, res) => {
  const notePath = path.join(cacheDir, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send("Not found");
  }
  fs.unlinkSync(notePath);
  res.sendStatus(200);
});

app.get("/notes", (req, res) => {
  const notes = fs.readdirSync(cacheDir).map((filename) => {
    const noteName = path.parse(filename).name;
    const noteText = fs.readFileSync(path.join(cacheDir, filename), "utf-8");
    return { name: noteName, text: noteText };
  });
  res.status(200).json(notes);
});

app.post("/write", upload.none(), (req, res) => {
  const { note_name, note } = req.body;

  // Validate inputs
  if (!note_name || !note) {
    return res.status(400).send("Missing required fields: note_name or note");
  }

  const notePath = path.join(cacheDir, `${note_name}.txt`);
  if (fs.existsSync(notePath)) {
    return res.status(400).send("Note already exists");
  }

  fs.writeFileSync(notePath, note);
  res.sendStatus(201);
});

app.get("/UploadForm.html", (req, res) => {
  const formHtml = `
    <html>
    <body>
      <h2>Upload Form</h2>
      <form method="post" action="/write" enctype="multipart/form-data">
        <label for="note_name_input">Note Name:</label><br>
        <input type="text" id="note_name_input" name="note_name"><br><br>
        <label for="note_input">Note:</label><br>
        <textarea id="note_input" name="note" rows="4" cols="50"></textarea><br><br>
        <button type="submit">Upload</button>
      </form>
    </body>
    </html>`;
  res.status(200).send(formHtml);
});

const server = app.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});