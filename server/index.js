import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Transform, Readable } from "node:stream";
import { TransformStream, WritableStream } from "node:stream/web";

import csvtojson from "csvtojson";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const CSV_FILE = __dirname + "/assets/db.csv";

createServer(async (request, response) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
  };
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  let count = 0;
  request.once("close", () =>
    console.log("connection was closed! ", count + " items was processed.")
  );

  Readable.toWeb(createReadStream(CSV_FILE))
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const d = JSON.parse(Buffer.from(chunk));
          controller.enqueue(
            JSON.stringify({
              name: d.display_name,
              comment: d.comment,
              rate: d.rate,
              date: d.date,
            }).concat("\n")
          );
        },
      })
    )
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          await setTimeout(50);
          count++;
          response.write(chunk);
        },
        close() {
          response.end();
        },
      })
    );

  response.writeHead(200, headers);
})
  .listen(PORT)
  .on("listening", () => console.log("server listening on ", PORT))
  .on("error", (error) => console.error("something was wrong! ", { error }));
