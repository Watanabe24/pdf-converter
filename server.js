const archiver = require("archiver");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

app.post("/convert-multi", upload.array("files"), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send("ファイルなし");
        }

        const format = req.body.format || "pdf";
        const outputDir = path.resolve("outputs");

        const sofficePath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

        const convertedFiles = [];

        for (const file of req.files) {
            const inputPath = path.resolve(file.path);

            await new Promise((resolve, reject) => {
                execFile(
                    sofficePath,
                    [
                        "--headless",
                        "--convert-to",
                        format,
                        "--outdir",
                        outputDir,
                        inputPath
                    ],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });

            const base = path.parse(file.originalname).name;
            const outputFile = path.join(outputDir, base + "." + format);
            convertedFiles.push(outputFile);

            fs.unlinkSync(inputPath);
        }

        // ZIP作成
        const zipName = "converted.zip";
        const zipPath = path.join(outputDir, zipName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip");

        archive.pipe(output);

        convertedFiles.forEach((file) => {
            archive.file(file, { name: path.basename(file) });
        });

        await archive.finalize();

        output.on("close", () => {
            convertedFiles.forEach(f => fs.unlinkSync(f));

            res.download(zipPath, () => {
                fs.unlinkSync(zipPath);
            });
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("バッチ変換失敗");
    }
});