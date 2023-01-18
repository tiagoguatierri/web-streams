const API_URL = "http://localhost:3000";

async function fetchAPI(signal) {
  const response = await fetch(API_URL, {
    signal,
  });

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseJSON());

  return reader;
}

function parseJSON() {
  let jsonBuffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      jsonBuffer += chunk;
      const items = jsonBuffer.split("\n");
      items
        .slice(0, -1)
        .forEach((item) => controller.enqueue(JSON.parse(item)));

      jsonBuffer = items[items.length - 1];
    },
    flush(controller) {
      if (!jsonBuffer) return;
      controller.enqueue(JSON.parse(jsonBuffer));
    },
  });
}

const intervals = [
  { label: "year", seconds: 31536000 },
  { label: "month", seconds: 2592000 },
  { label: "day", seconds: 86400 },
  { label: "hour", seconds: 3600 },
  { label: "minute", seconds: 60 },
  { label: "second", seconds: 1 },
];

function timeSince(date) {
  date = new Date(date);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const interval = intervals.find((i) => i.seconds < seconds);
  const count = Math.floor(seconds / interval.seconds);
  return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
}

function renderItems(el) {
  let count = 0;
  return new WritableStream({
    async write({ name, comment, rate, date }) {
      count++;
      const card = `
      <article
          class="flex flex-col border border-slate-100 shadow-lg rounded-lg p-5"
        >
          <h4 class="font-semibold">[${count}] - ${name}</h4>
          <p class="comment mb-2">${comment}</p>
          <div class="text-center mt-auto">
            <p class="text-slate-400 text-sm pb-1">${timeSince(date)}</p>
            <span
              class="mx-auto bg-indigo-500 text-white text-sm px-2 py-1 rounded"
            >
              <i class="las la-star"></i>
              ${rate}
            </span>
          </div>
        </article>
      `;
      el.innerHTML += card;
    },
    abort(reason) {
      console.log("aborted**", reason);
    },
  });
}

const [start, stop, cards] = ["start", "stop", "cards"].map((id) =>
  document.getElementById(id)
);

let abortController = new AbortController();

start.addEventListener("click", async () => {
  const reader = await fetchAPI(abortController.signal);
  reader.pipeTo(renderItems(cards));
});

stop.addEventListener("click", () => {
  abortController.abort();
  console.log("aborting...");
  abortController = new AbortController();
});
