import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
const render = (md) =>
  sanitizeHtml(marked.parse(md), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2"]),
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
export default function ({
  db,
  app,
  router,
  run,
  get,
  all,
  id,
  now,
  text,
  integer,
  required,
  fail,
}) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),title TEXT,slug TEXT UNIQUE,markdown TEXT,status TEXT DEFAULT 'draft',version INTEGER DEFAULT 1,updated_at TEXT);`,
  );
  app.get("/public/posts/:slug", (req, res) => {
    const p = required(
      get(
        "SELECT title,markdown,updated_at FROM posts WHERE slug=? AND status='published'",
        req.params.slug,
      ),
    );
    res.json({ ...p, html: render(p.markdown) });
  });
  router.get("/posts", (req, res) =>
    res.json(
      all(
        "SELECT * FROM posts WHERE owner=? ORDER BY updated_at DESC",
        req.user.id,
      ),
    ),
  );
  router.post("/preview", (req, res) =>
    res.json({
      html: render(
        typeof req.body.markdown === "string"
          ? req.body.markdown.slice(0, 50000)
          : "",
      ),
    }),
  );
  router.post("/posts", (req, res) => {
    const pid = id(),
      title = text(req.body.title);
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) +
      "-" +
      pid.slice(0, 6);
    run(
      "INSERT INTO posts(id,owner,title,slug,markdown,updated_at) VALUES(?,?,?,?,?,?)",
      pid,
      req.user.id,
      title,
      slug,
      text(req.body.markdown, 50000),
      now(),
    );
    res.status(201).json({ id: pid, slug });
  });
  router.patch("/posts/:id", (req, res) => {
    required(
      get(
        "SELECT id FROM posts WHERE id=? AND owner=?",
        req.params.id,
        req.user.id,
      ),
    );
    const result = run(
      "UPDATE posts SET title=?,markdown=?,version=version+1,updated_at=? WHERE id=? AND owner=? AND version=?",
      text(req.body.title),
      text(req.body.markdown, 50000),
      now(),
      req.params.id,
      req.user.id,
      integer(req.body.version, 1),
    );
    if (!result.changes) fail(409, "Yazı başka sekmede değişti; yeniden yükle");
    res.json(get("SELECT * FROM posts WHERE id=?", req.params.id));
  });
  router.post("/posts/:id/publish", (req, res) => {
    required(
      get(
        "SELECT id FROM posts WHERE id=? AND owner=?",
        req.params.id,
        req.user.id,
      ),
    );
    run(
      "UPDATE posts SET status='published',version=version+1,updated_at=? WHERE id=?",
      now(),
      req.params.id,
    );
    res.json({ ok: true });
  });
  router.delete("/posts/:id", (req, res) => {
    required(
      get(
        "SELECT id FROM posts WHERE id=? AND owner=?",
        req.params.id,
        req.user.id,
      ),
    );
    run("DELETE FROM posts WHERE id=?", req.params.id);
    res.json({ ok: true });
  });
}
