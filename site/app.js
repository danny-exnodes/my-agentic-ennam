// Static Agent Ops: renders site/data/status.json (built by scripts/build_status.py) and polls it.
(function () {
  "use strict";
  var TZ = "Asia/Ho_Chi_Minh";
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function pill(text, tone) { return el("span", "pill p-" + tone, text); }
  function fmtTime(iso) {
    if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return String(iso);
    return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(d);
  }
  function ago(iso) {
    if (!iso) return ""; var t = new Date(iso).getTime(); if (isNaN(t)) return "";
    var s = Math.round((Date.now() - t) / 1000), f = s < 0, a = Math.abs(s), out;
    if (a < 60) out = a + " giây"; else if (a < 3600) out = Math.round(a / 60) + " phút"; else if (a < 86400) out = Math.round(a / 3600) + " giờ"; else out = Math.round(a / 86400) + " ngày";
    return f ? "sau " + out : out + " trước";
  }
  function todayKey() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); }
  $("today").textContent = "Hôm nay " + new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()) + " (giờ Việt Nam)";

  var AGENT_TONE = { working: ["Đang làm", "ok"], waiting: ["Chờ phản hồi", "info"], blocked: ["Bị chặn", "bad"], error: ["Lỗi", "bad"], idle: ["Rảnh", "idle"], done: ["Xong", "idle"] };
  var STAGES = [["researched", "Đã nghiên cứu"], ["contacted", "Đã liên hệ"], ["replied", "Đã phản hồi"], ["meeting", "Hẹn gọi"], ["proposal", "Báo giá"], ["won", "Chốt"], ["lost", "Dừng"], ["hold", "Tạm giữ"]];
  var STAGE_TONE = { researched: "idle", contacted: "info", replied: "ok", meeting: "ok", proposal: "warn", won: "ok", lost: "idle", hold: "warn" };
  var KIND = { email: "email", reply: "reply", task: "task", report: "báo cáo", research: "tìm", blocked: "chặn", error: "lỗi", note: "ghi" };
  var BUCKET = { SESSION_STATUS_BUCKET_WORKING: ["Đang làm", "ok"], SESSION_STATUS_BUCKET_BLOCKED: ["Chờ anh", "warn"], SESSION_STATUS_BUCKET_REVIEW_READY: ["Chờ duyệt", "info"], SESSION_STATUS_BUCKET_COMPLETED: ["Xong", "idle"], SESSION_STATUS_BUCKET_FAILED: ["Lỗi", "bad"] };

  function rowTop(name, extra, pillNode) {
    var top = el("div", "top"), left = el("div");
    left.appendChild(el("span", "name", name));
    if (extra) left.appendChild(el("span", "meta", " · " + extra));
    top.appendChild(left); if (pillNode) top.appendChild(pillNode); return top;
  }

  function renderAgents(list) {
    var box = $("agents"); clear(box);
    if (!list.length) { box.appendChild(el("div", "empty", "Chưa có agent nào báo trạng thái.")); return; }
    list.sort(function (a, b) { return String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")); });
    list.forEach(function (a) {
      var r = el("div", "row"), t = AGENT_TONE[a.status] || [a.status || "?", "idle"];
      r.appendChild(rowTop(a.name || "Agent", a.role, pill(t[0], t[1])));
      if (a.task) r.appendChild(el("div", "", a.task));
      var m = []; if (a.next) m.push("Tiếp theo: " + a.next); if (a.updatedAt) m.push("cập nhật " + ago(a.updatedAt));
      if (m.length) r.appendChild(el("div", "meta", m.join(" · ")));
      box.appendChild(r);
    });
    $("agentsAt").textContent = list[0].updatedAt ? ago(list[0].updatedAt) : "";
  }
  function renderAsks(list) {
    var box = $("asks"); clear(box);
    var open = list.filter(function (a) { return a.status !== "done"; })
      .sort(function (a, b) { return (a.priority || 9) - (b.priority || 9) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")); });
    $("k-asks").textContent = open.length;
    if (!open.length) { box.appendChild(el("div", "empty", "Không có việc nào đang chờ.")); return; }
    open.forEach(function (a) {
      var r = el("div", "row");
      r.appendChild(rowTop(a.title || "Việc cần duyệt", null, pill(a.due ? "hạn " + a.due : (a.priority === 1 ? "gấp" : "chờ"), a.priority === 1 ? "bad" : "warn")));
      if (a.detail) r.appendChild(el("div", "meta", a.detail));
      box.appendChild(r);
    });
  }
  function renderMetrics(list) {
    var key = todayKey(), doc = null;
    list.forEach(function (v) { if (v.date === key) doc = v; });
    if (!doc && list.length) doc = list.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })[0];
    function set(id, v) { $(id).textContent = v == null ? "0" : v; }
    if (!doc) return;
    set("k-sent", doc.emailsSent); set("k-replies", doc.replies); set("k-leads", doc.newLeads); set("k-proposals", doc.proposals); set("k-meetings", doc.meetings);
  }
  function renderPipeline(rows) {
    var box = $("pipeline"), st = $("stages"); clear(box); clear(st);
    var counts = {}, order = {}, label = {};
    rows.forEach(function (p) { counts[p.stage] = (counts[p.stage] || 0) + 1; });
    STAGES.forEach(function (s, i) { order[s[0]] = i; label[s[0]] = s[1]; if (counts[s[0]]) st.appendChild(el("span", "stage", s[1] + " " + counts[s[0]])); });
    if (!rows.length) { box.appendChild(el("div", "empty", "Chưa có lead nào trong pipeline.")); return; }
    rows.sort(function (a, b) { return (order[a.stage] == null ? 99 : order[a.stage]) - (order[b.stage] == null ? 99 : order[b.stage]) || String(b.lastTouch || "").localeCompare(String(a.lastTouch || "")); });
    rows.forEach(function (p) {
      var r = el("div", "row");
      r.appendChild(rowTop(p.company || "Lead", [p.market, p.segment].filter(Boolean).join(" · "), pill(label[p.stage] || p.stage || "?", STAGE_TONE[p.stage] || "idle")));
      var m = []; if (p.next) m.push("Tiếp: " + p.next); if (p.owner) m.push(p.owner); if (p.lastTouch) m.push(fmtTime(p.lastTouch));
      if (m.length) r.appendChild(el("div", "meta", m.join(" · ")));
      box.appendChild(r);
    });
  }
  function renderEvents(list) {
    var box = $("events"); clear(box);
    list = list.slice().sort(function (a, b) { return String(b.ts || "").localeCompare(String(a.ts || "")); }).slice(0, 60);
    if (!list.length) { box.appendChild(el("div", "empty", "Chưa có hoạt động nào.")); return; }
    list.forEach(function (e) {
      var r = el("div", "row ev"), body = el("div"), top = el("div", "top");
      r.appendChild(el("div", "k", KIND[e.kind] || e.kind || "·"));
      top.appendChild(el("span", "", e.title || "")); top.appendChild(el("span", "time", fmtTime(e.ts))); body.appendChild(top);
      var m = [e.agent, e.detail].filter(Boolean).join(" · "); if (m) body.appendChild(el("div", "meta", m));
      r.appendChild(body); box.appendChild(r);
    });
  }
  function renderTriggers(list, at) {
    var box = $("triggers"); clear(box); $("trigAt").textContent = at ? "chụp " + ago(at) : "";
    if (!list.length) { box.appendChild(el("div", "empty", "Chưa có routine nào được công khai.")); return; }
    list.forEach(function (t) {
      var r = el("div", "row"), lr = t.last_run || {}, st = String(lr.status || ""), tone, label;
      if (!t.enabled) { tone = "idle"; label = "Đã tắt"; }
      else if (/FAILED/.test(st)) { tone = "bad"; label = "Lần trước lỗi"; }
      else if (/SUCCEEDED/.test(st)) { tone = "ok"; label = "Đang bật"; }
      else { tone = "info"; label = "Chưa chạy lần nào"; }
      r.appendChild(rowTop(t.name || "Routine", null, pill(label, tone)));
      var m = []; if (t.enabled && t.next_run_at) m.push("Lần tới " + fmtTime(t.next_run_at) + " (" + ago(t.next_run_at) + ")"); if (lr.fired_at) m.push("Lần trước " + fmtTime(lr.fired_at));
      if (m.length) r.appendChild(el("div", "meta", m.join(" · ")));
      box.appendChild(r);
    });
  }
  function renderSessions(list, at) {
    var box = $("sessions"); clear(box); $("sessAt").textContent = at ? "chụp " + ago(at) : "";
    if (!list.length) { box.appendChild(el("div", "empty", "Chưa có session nào được công khai.")); return; }
    list.forEach(function (s) {
      var r = el("div", "row"), b = BUCKET[s.status_bucket] || ["?", "idle"];
      r.appendChild(rowTop(s.title || "Session", null, pill(b[0], b[1])));
      if (s.summary) r.appendChild(el("div", "meta", s.summary));
      if (s.updated_at) r.appendChild(el("div", "time", ago(s.updated_at)));
      box.appendChild(r);
    });
  }

  var last = null;
  function load() {
    fetch("data/status.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      last = d;
      renderAgents(d.agents || []); renderAsks(d.asks || []); renderMetrics(d.metrics || []);
      renderPipeline(d.pipeline || []); renderEvents(d.events || []);
      renderTriggers(d.routines || [], d.routinesAt); renderSessions(d.sessions || [], d.routinesAt);
      $("genAt").textContent = fmtTime(d.generatedAt) + " (" + ago(d.generatedAt) + ")";
      $("live").classList.add("on"); $("liveText").textContent = "đã tải · " + fmtTime(new Date().toISOString());
    }).catch(function () {
      $("live").classList.remove("on");
      $("liveText").textContent = last ? "không tải được bản mới, đang hiện dữ liệu cũ" : "không tải được dữ liệu";
    });
  }
  load();
  setInterval(function () { if (!document.hidden) load(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) load(); });
})();
