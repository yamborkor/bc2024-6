const express = require("express");
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

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

// Swagger configuration
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Notes Service API",
    version: "1.0.0",
    description: "API для роботи з текстовими нотатками",
  },
  servers: [
    {
      url: `http://${options.host}:${options.port}`,
      description: "Local server",
    },
  ],
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Отримати нотатку за ім'ям
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Ім'я нотатки
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успішне отримання нотатки
 *       404:
 *         description: Нотатка не знайдена
 */
app.get("/notes/:name", (req, res) => {
  const notePath = path.join(cacheDir, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send("Not found");
  }
  const noteText = fs.readFileSync(notePath, "utf-8");
  res.send(noteText);
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Оновити текст існуючої нотатки
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Ім'я нотатки
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Нотатка успішно оновлена
 *       404:
 *         description: Нотатка не знайдена
 */
app.put("/notes/:name", (req, res) => {
  const notePath = path.join(cacheDir, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send("Not found");
  }
  fs.writeFileSync(notePath, req.body.text || "");
  res.sendStatus(200);
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Видалити нотатку за ім'ям
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Ім'я нотатки
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Нотатка успішно видалена
 *       404:
 *         description: Нотатка не знайдена
 */
app.delete("/notes/:name", (req, res) => {
  const notePath = path.join(cacheDir, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send("Not found");
  }
  fs.unlinkSync(notePath);
  res.sendStatus(200);
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати список усіх нотаток
 *     responses:
 *       200:
 *         description: Успішне отримання списку нотаток
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   text:
 *                     type: string
 */
app.get("/notes", (req, res) => {
  const notes = fs.readdirSync(cacheDir).map((filename) => {
    const noteName = path.parse(filename).name;
    const noteText = fs.readFileSync(path.join(cacheDir, filename), "utf-8");
    return { name: noteName, text: noteText };
  });
  res.status(200).json(notes);
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Додати нову нотатку
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *                 description: Ім'я нотатки
 *               note:
 *                 type: string
 *                 description: Текст нотатки
 *     responses:
 *       201:
 *         description: Нотатка успішно створена
 *       400:
 *         description: Неправильний запит або нотатка вже існує
 */
app.post("/write", upload.none(), (req, res) => {
  const { note_name, note } = req.body;

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

const server = app.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});
