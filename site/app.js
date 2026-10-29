// Agent Ops web app: Supabase Auth + row level security, live via Supabase Realtime.
(function () {
  "use strict";
  var TZ = "Asia/Ho_Chi_Minh";
  var cfg = window.AGENT_OPS_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function pill(text, tone) { return el("span", "pill p-" + tone, text); }
  function fmt(iso) {
    if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return String(iso);
    return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(d);
  }
  function ago(iso) {
    if (!iso) return ""; var t = new Date(iso).getTime(); if (isNaN(t)) return "";
    var s = Math.round((Date.now() - t) / 1000), fut = s < 0, a = Math.abs(s), o;
    if (a < 60) o = a + " giây"; else if (a < 3600) o = Math.round(a / 60) + " phút"; else if (a < 86400) o = Math.round(a / 3600) + " giờ"; else o = Math.round(a / 86400) + " ngày";
    return fut ? "sau " + o : o + " trước";
  }
  function todayKey() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); }
  function row(title, extra, right) {
    var r = el("div", "row"), top = el("div", "top"), left = el("div");
    left.appendChild(el("span", "name", title));
    if (extra) left.appendChild(el("span", "meta", " · " + extra));
    top.appendChild(left); if (right) top.appendChild(right); r.appendChild(top); return r;
  }
  function meta(parts) { var p = parts.filter(Boolean); return p.length ? el("div", "meta", p.join(" · ")) : null; }
  function add(parent, child) { if (child) parent.appendChild(child); return parent; }
  function empty(box, text) { clear(box); box.appendChild(el("div", "empty", text)); }
  $("today").textContent = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()) + " (giờ Việt Nam)";

  var AGENT = { working: ["Đang làm", "ok"], waiting: ["Chờ", "info"], blocked: ["Bị chặn", "bad"], error: ["Lỗi", "bad"], idle: ["Rảnh", "idle"], done: ["Xong", "idle"], stale: ["Mất kết nối", "warn"] };
  var KIND = { cloud: "cloud", local: "local", routine: "routine", human: "người" };
  var RUN = { running: ["Đang chạy", "ok"], done: ["Xong", "idle"], failed: ["Lỗi", "bad"], stale: ["Mất kết nối", "warn"] };
  var HEALTH = { ok: ["Bình thường", "ok"], missed: ["Lỡ lịch", "bad"], failed: ["Lần trước lỗi", "bad"], disabled: ["Đã tắt", "idle"] };
  var STAGES = [["researched", "Đã nghiên cứu"], ["contacted", "Đã liên hệ"], ["replied", "Đã phản hồi"], ["meeting", "Hẹn gọi"], ["proposal", "Báo giá"], ["won", "Chốt"], ["lost", "Dừng"], ["hold", "Tạm giữ"]];
  var STAGE_TONE = { researched: "idle", contacted: "info", replied: "ok", meeting: "ok", proposal: "warn", won: "ok", lost: "idle", hold: "warn" };
  var AP = { pending: ["Chờ duyệt", "warn"], approved: ["Đã duyệt, chờ gửi", "info"], rejected: ["Từ chối", "idle"], executed: ["Đã gửi", "ok"], failed: ["Gửi lỗi", "bad"], cancelled: ["Đã huỷ", "idle"] };
  var EVK = { email: "email", reply: "reply", task: "task", report: "báo cáo", research: "tìm", blocked: "chặn", error: "lỗi", note: "ghi", approval: "duyệt" };

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) { $("setup").hidden = false; return; }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
  var state = { role: null, data: {}, apFilter: "pending", prFilter: "queued" };

  // ------------------------------------------------------------ auth
  $("loginForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var email = $("email").value.trim().toLowerCase();
    $("loginMsg").textContent = "Đang gửi…";
    sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } }).then(function (r) {
      $("loginMsg").textContent = r.error ? "Không gửi được: " + r.error.message : "Đã gửi link đăng nhập tới " + email + ". Mở email trên thiết bị này để vào.";
    });
  });
  $("signOut").addEventListener("click", function () { sb.auth.signOut().then(function () { location.reload(); }); });

  sb.auth.onAuthStateChange(function (_event, session) { boot(session); });
  var booted = false;
  function boot(session) {
    if (!session) { $("login").hidden = false; $("app").hidden = true; $("signOut").hidden = true; $("who").textContent = ""; return; }
    if (booted) return; booted = true;
    $("login").hidden = true; $("signOut").hidden = false; $("who").textContent = session.user.email;
    sb.rpc("admin_role").then(function (r) {
      state.role = r.data || null;
      if (!state.role) { $("denied").hidden = false; return; }
      $("app").hidden = false; $("navSettings").hidden = state.role !== "owner";
      route(); loadAll(); subscribe();
      setInterval(function () { if (!document.hidden) { loadViews(); renderAll(); } }, 60000);
    });
  }

  // ------------------------------------------------------------ data
  var QUERIES = {
    agents: function () { return sb.from("v_agents").select("*").order("updated_at", { ascending: false }); },
    runs: function () { return sb.from("v_runs").select("*").order("started_at", { ascending: false }).limit(40); },
    schedules: function () { return sb.from("v_schedules").select("*").order("next_run_at", { ascending: true, nullsFirst: false }); },
    schedule_runs: function () { return sb.from("schedule_runs").select("*").order("fired_at", { ascending: false }).limit(30); },
    approvals: function () { return sb.from("approvals").select("*").order("created_at", { ascending: false }).limit(200); },
    events: function () { return sb.from("events").select("*").order("ts", { ascending: false }).limit(150); },
    pipeline: function () { return sb.from("pipeline").select("*").order("updated_at", { ascending: false }).limit(1000); },
    prospects: function () { return sb.from("prospects").select("*").order("updated_at", { ascending: false }).limit(1000); },
    metrics: function () { return sb.from("metrics").select("*").order("date", { ascending: false }).limit(14); },
  };
  var OWNER_QUERIES = {
    tokens: function () { return sb.from("agent_tokens").select("id, agent_id, label, allow_agents, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }); },
    admins: function () { return sb.from("admins").select("*").order("email"); },
  };
  function load(name) {
    var q = QUERIES[name] || OWNER_QUERIES[name];
    return q().then(function (r) {
      if (r.error) { console.warn(name, r.error.message); return; }
      state.data[name] = r.data || []; renderAll();
    });
  }
  function loadAll() {
    var names = Object.keys(QUERIES); if (state.role === "owner") names = names.concat(Object.keys(OWNER_QUERIES));
    return Promise.all(names.map(load)).then(function () { $("live").classList.add("on"); $("liveText").textContent = "trực tiếp · " + fmt(new Date().toISOString()); });
  }
  function loadViews() { ["agents", "runs", "schedules"].forEach(load); }
  var TABLE_TO = { agents: ["agents"], runs: ["runs", "agents"], events: ["events"], schedules: ["schedules"], schedule_runs: ["schedule_runs", "schedules"],
    approvals: ["approvals"], pipeline: ["pipeline"], prospects: ["prospects"], metrics: ["metrics"] };
  var pending = {}, timer = null;
  function subscribe() {
    var ch = sb.channel("agent-ops");
    Object.keys(TABLE_TO).forEach(function (t) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table: t }, function () {
        TABLE_TO[t].forEach(function (n) { pending[n] = 1; });
        clearTimeout(timer); timer = setTimeout(function () { var n = Object.keys(pending); pending = {}; n.forEach(load); markLive(); }, 400);
      });
    });
    ch.subscribe(function (status) {
      $("live").classList.toggle("on", status === "SUBSCRIBED");
      $("liveText").textContent = status === "SUBSCRIBED" ? "trực tiếp · " + fmt(new Date().toISOString()) : "đang kết nối lại…";
      if (status === "SUBSCRIBED") loadAll();
    });
  }
  function markLive() { $("liveText").textContent = "trực tiếp · " + fmt(new Date().toISOString()); }

  // ------------------------------------------------------------ routing
  function route() {
    var tab = (location.hash || "#overview").slice(1);
    if (!document.querySelector('[data-view="' + tab + '"]') || (tab === "settings" && state.role !== "owner")) tab = "overview";
    document.querySelectorAll("[data-view]").forEach(function (s) { s.hidden = s.getAttribute("data-view") !== tab; });
    document.querySelectorAll("[data-tab]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-tab") === tab); });
  }
  window.addEventListener("hashchange", route);

  // ------------------------------------------------------------ render
  function renderAll() {
    var d = state.data;
    renderKpis(d); renderAlerts(d); renderAgents(d); renderRuns(d); renderSchedules(d); renderApprovals(d);
    renderPipeline(d); renderProspects(d); renderEvents(d.events || [], $("events"), 150); renderEvents(d.events || [], $("ovEvents"), 12);
    if (state.role === "owner") { renderTokens(d); renderAdmins(d); }
  }
  function renderKpis(d) {
    var m = (d.metrics || []).filter(function (x) { return x.date === todayKey(); })[0] || (d.metrics || [])[0] || {};
    var pendingN = (d.approvals || []).filter(function (a) { return a.status === "pending"; }).length;
    $("navApprovals").textContent = pendingN || "";
    var box = $("kpis"); clear(box);
    [[m.emails_sent, "Email đã gửi"], [m.replies, "Phản hồi"], [m.new_leads, "Lead mới"], [m.proposals, "Đề xuất / báo giá"], [m.meetings, "Cuộc hẹn"], [pendingN, "Chờ anh duyệt"]].forEach(function (k) {
      var c = el("div", "kpi"); c.appendChild(el("b", "", k[0] == null ? 0 : k[0])); c.appendChild(el("span", "", k[1])); box.appendChild(c);
    });
  }
  function renderAlerts(d) {
    var box = $("alerts"); clear(box);
    var items = [];
    (d.approvals || []).filter(function (a) { return a.status === "pending"; }).forEach(function (a) { items.push([a.priority === 1 ? "bad" : "warn", "Chờ duyệt: " + a.title, a.due ? "hạn " + a.due : a.summary, "#approvals"]); });
    (d.approvals || []).filter(function (a) { return a.status === "failed"; }).forEach(function (a) { items.push(["bad", "Gửi lỗi: " + a.title, a.result && a.result.error, "#approvals"]); });
    (d.agents || []).filter(function (a) { return a.live_status === "stale" || a.live_status === "error" || a.live_status === "blocked"; }).forEach(function (a) { items.push([a.live_status === "stale" ? "warn" : "bad", a.name + ": " + AGENT[a.live_status][0], a.task, "#agents"]); });
    (d.schedules || []).filter(function (s) { return s.health === "missed" || s.health === "failed"; }).forEach(function (s) { items.push(["bad", s.name + ": " + HEALTH[s.health][0], s.next_run_at ? "lịch " + fmt(s.next_run_at) : "", "#routines"]); });
    if (!items.length) { empty(box, "Không có gì cần chú ý."); return; }
    items.forEach(function (i) { var r = row(i[1], null, pill(i[0] === "bad" ? "gấp" : "chú ý", i[0])); add(r, meta([i[2]])); r.style.cursor = "pointer"; r.addEventListener("click", function () { location.hash = i[3]; }); box.appendChild(r); });
  }
  function agentRow(a) {
    var s = AGENT[a.live_status] || [a.live_status, "idle"];
    var r = row(a.name, null, pill(s[0], s[1]));
    r.querySelector(".top > div").appendChild(el("span", "tag", KIND[a.kind] || a.kind));
    add(r, a.task ? el("div", "", a.task) : null);
    add(r, meta([a.role, a.host, a.next ? "Tiếp: " + a.next : null, a.last_heartbeat ? "tín hiệu " + ago(a.last_heartbeat) : (a.kind === "human" ? null : "chưa có tín hiệu"), a.active_runs ? a.active_runs + " lần chạy đang mở" : null]));
    return r;
  }
  function renderAgents(d) {
    var list = d.agents || [];
    var box = $("agents"); clear(box); if (!list.length) empty(box, "Chưa có agent nào. Thêm agent ở mục Cài đặt."); else list.forEach(function (a) { box.appendChild(agentRow(a)); });
    var ov = $("ovAgents"); clear(ov);
    var live = list.filter(function (a) { return a.kind !== "human" && (a.live_status === "working" || a.active_runs > 0); });
    if (!live.length) empty(ov, "Không có agent nào đang chạy."); else live.forEach(function (a) { ov.appendChild(agentRow(a)); });
  }
  function renderRuns(d) {
    var box = $("runs"); clear(box); var list = d.runs || [];
    if (!list.length) { empty(box, "Chưa có lần chạy nào."); return; }
    list.forEach(function (r) {
      var s = RUN[r.live_status] || [r.live_status, "idle"];
      var x = row(r.agent_id, r.kind + (r.schedule_id ? " · " + r.schedule_id : ""), pill(s[0], s[1]));
      add(x, meta(["bắt đầu " + fmt(r.started_at), r.ended_at ? "kết thúc " + fmt(r.ended_at) : "tín hiệu " + ago(r.last_heartbeat), r.tool_calls ? r.tool_calls + " lần dùng tool" : null, r.last_tool, r.host]));
      add(x, r.summary ? el("div", "meta", r.summary) : null);
      box.appendChild(x);
    });
  }
  function renderSchedules(d) {
    var box = $("schedules"); clear(box); var list = d.schedules || [];
    if (!list.length) empty(box, "Chưa đồng bộ routine nào. Agent chạy: agentops.py schedules-sync.");
    list.forEach(function (s) {
      var h = HEALTH[s.health] || [s.health, "idle"];
      var x = row(s.name, s.source, pill(h[0], h[1]));
      add(x, meta([s.cron, s.enabled && s.next_run_at ? "lần tới " + fmt(s.next_run_at) + " (" + ago(s.next_run_at) + ")" : null,
        s.last_fired_at ? "lần trước " + fmt(s.last_fired_at) : null, s.last_reported_at ? "agent báo " + ago(s.last_reported_at) : null,
        s.last_failure, s.synced_at ? "đồng bộ " + ago(s.synced_at) : null]));
      box.appendChild(x);
    });
    var rb = $("scheduleRuns"); clear(rb); var runs = d.schedule_runs || [];
    if (!runs.length) empty(rb, "Chưa có routine nào báo về.");
    runs.forEach(function (r) { var x = row(r.schedule_id, null, pill(r.status, r.status === "failed" ? "bad" : "ok")); add(x, meta([fmt(r.fired_at), r.run_id, r.note])); rb.appendChild(x); });
  }

  // ------------------------------------------------------------ approvals
  document.querySelectorAll("[data-ap]").forEach(function (b) {
    b.addEventListener("click", function () { state.apFilter = b.getAttribute("data-ap"); document.querySelectorAll("[data-ap]").forEach(function (x) { x.classList.toggle("on", x === b); }); renderApprovals(state.data); });
  });
  function decide(a, status, note, btns) {
    btns.forEach(function (b) { b.disabled = true; });
    sb.from("approvals").update({ status: status, decision_note: note || null }).eq("id", a.id).eq("status", a.status).select("id").then(function (r) {
      if (r.error || !r.data || !r.data.length) { alert("Không cập nhật được: " + (r.error ? r.error.message : "đề xuất đã thay đổi, tải lại")); btns.forEach(function (b) { b.disabled = false; }); }
      load("approvals");
    });
  }
  function renderApprovals(d) {
    var box = $("approvals"); clear(box);
    var f = state.apFilter;
    var list = (d.approvals || []).filter(function (a) { return f === "done" ? ["executed", "rejected", "failed", "cancelled"].indexOf(a.status) >= 0 : a.status === f; });
    if (f === "pending") list.sort(function (a, b) { return (a.priority - b.priority) || String(a.created_at).localeCompare(String(b.created_at)); });
    if (!list.length) { empty(box, f === "pending" ? "Không có đề xuất nào chờ duyệt." : "Trống."); return; }
    list.forEach(function (a) {
      var c = el("article", "card"), s = AP[a.status] || [a.status, "idle"];
      var top = el("div", "top"); top.appendChild(el("span", "name", a.title)); top.appendChild(pill(s[0], s[1])); c.appendChild(top);
      add(c, meta([a.agent_id, "tạo " + fmt(a.created_at), a.due ? "hạn " + a.due : null, a.priority === 1 ? "ưu tiên cao" : null]));
      add(c, a.summary ? el("div", "", a.summary) : null);
      var p = a.payload || {};
      if (a.kind === "send_email" || p.subject) {
        var mail = el("div", "mail"), head = el("div", "mailhead");
        head.appendChild(el("div", "", "Tới: " + [].concat(p.to || []).join(", ")));
        if (p.cc && p.cc.length) head.appendChild(el("div", "", "Cc: " + [].concat(p.cc).join(", ")));
        head.appendChild(el("div", "name", "Tiêu đề: " + (p.subject || "")));
        mail.appendChild(head);
        var frame = document.createElement("iframe");
        frame.setAttribute("sandbox", ""); frame.setAttribute("title", "Nội dung email"); frame.setAttribute("referrerpolicy", "no-referrer");
        frame.srcdoc = '<meta charset="utf-8"><style>body{font:14px/1.5 system-ui,sans-serif;margin:12px;color:#111}</style>' + (p.html || "");
        mail.appendChild(frame); c.appendChild(mail);
      } else {
        var shown = {}; Object.keys(p).forEach(function (k) { if (k !== "migrated_from") shown[k] = p[k]; });
        if (Object.keys(shown).length) c.appendChild(el("pre", "meta", JSON.stringify(shown, null, 1)));
      }
      if (a.decided_by) add(c, meta(["quyết định bởi " + a.decided_by, fmt(a.decided_at), a.decision_note]));
      if (a.executed_at) add(c, meta(["thực hiện " + fmt(a.executed_at), a.result && (a.result.message_id || a.result.error)]));
      if (a.status === "pending" && (state.role === "owner" || state.role === "approver")) {
        var acts = el("div", "actions"), ok = el("button", "btn primary", "Duyệt"), no = el("button", "btn", "Từ chối"), cancel = el("button", "btn ghost", "Huỷ");
        [ok, no, cancel].forEach(function (b) { b.type = "button"; acts.appendChild(b); });
        var btns = [ok, no, cancel];
        ok.addEventListener("click", function () { decide(a, "approved", null, btns); });
        no.addEventListener("click", function () { var note = prompt("Lý do từ chối (agent sẽ đọc):") ; if (note !== null) decide(a, "rejected", note, btns); });
        cancel.addEventListener("click", function () { decide(a, "cancelled", null, btns); });
        c.appendChild(acts);
      } else if (a.status === "approved" && (state.role === "owner" || state.role === "approver")) {
        var acts2 = el("div", "actions"), back = el("button", "btn ghost", "Huỷ duyệt"); back.type = "button";
        back.addEventListener("click", function () { decide(a, "cancelled", "huỷ trước khi gửi", [back]); });
        acts2.appendChild(back); acts2.appendChild(el("span", "meta", "Agent sẽ gửi ở lần chạy kế tiếp.")); c.appendChild(acts2);
      }
      box.appendChild(c);
    });
  }

  // ------------------------------------------------------------ sales data
  $("pipeFilter").addEventListener("input", function () { renderPipeline(state.data); });
  function renderPipeline(d) {
    var rows = d.pipeline || [], q = $("pipeFilter").value.trim().toLowerCase();
    var st = $("stages"); clear(st); var counts = {};
    rows.forEach(function (p) { counts[p.stage] = (counts[p.stage] || 0) + 1; });
    STAGES.forEach(function (s) { if (counts[s[0]]) st.appendChild(el("span", "stage", s[1] + " " + counts[s[0]])); });
    if (q) rows = rows.filter(function (p) { return [p.company, p.market, p.segment, p.owner, p.next].join(" ").toLowerCase().indexOf(q) >= 0; });
    var order = {}, label = {}; STAGES.forEach(function (s, i) { order[s[0]] = i; label[s[0]] = s[1]; });
    rows = rows.slice().sort(function (a, b) { return (order[a.stage] - order[b.stage]) || String(b.last_touch || "").localeCompare(String(a.last_touch || "")); });
    var box = $("pipeline"); clear(box);
    if (!rows.length) { empty(box, "Chưa có lead nào."); return; }
    rows.forEach(function (p) { var x = row(p.company, [p.market, p.segment].filter(Boolean).join(" · "), pill(label[p.stage] || p.stage, STAGE_TONE[p.stage] || "idle")); add(x, meta([p.next ? "Tiếp: " + p.next : null, p.owner, p.value_note, p.last_touch ? fmt(p.last_touch) : null])); box.appendChild(x); });
  }
  document.querySelectorAll("[data-pr]").forEach(function (b) {
    b.addEventListener("click", function () { state.prFilter = b.getAttribute("data-pr"); document.querySelectorAll("[data-pr]").forEach(function (x) { x.classList.toggle("on", x === b); }); renderProspects(state.data); });
  });
  function renderProspects(d) {
    var box = $("prospects"); clear(box);
    var list = (d.prospects || []).filter(function (p) { return p.status === state.prFilter; });
    if (!list.length) { empty(box, "Trống."); return; }
    list.forEach(function (p) {
      var x = row(p.company, [p.country, p.city, p.segment].filter(Boolean).join(" · "), p.hold_reason ? pill("giữ: " + p.hold_reason, "warn") : null);
      add(x, p.angle ? el("div", "", p.angle) : null);
      add(x, meta([p.evidence, p.email_public || p.contact_form, p.contacted_at ? "chào " + fmt(p.contacted_at) : null]));
      box.appendChild(x);
    });
  }
  function renderEvents(list, box, n) {
    clear(box);
    if (!list.length) { empty(box, "Chưa có hoạt động nào."); return; }
    list.slice().sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); }).slice(0, n).forEach(function (e) {
      var x = row(e.title, null, el("span", "time", fmt(e.ts)));
      x.querySelector(".top > div").insertBefore(el("span", "tag", EVK[e.kind] || e.kind), x.querySelector(".name"));
      add(x, meta([e.agent_id, e.detail]));
      box.appendChild(x);
    });
  }

  // ------------------------------------------------------------ settings (owner)
  function b64url(bytes) { var s = ""; bytes.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function sha256Hex(text) { return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }); }
  $("agentForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var id = $("agId").value.trim().toLowerCase(), kind = $("agKind").value;
    var allow = $("agAllow").value.split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var agent = { id: id, name: $("agName").value.trim(), kind: kind, role: $("agRole").value.trim() || null, updated_at: new Date().toISOString() };
    sb.from("agents").upsert(agent, { onConflict: "id" }).then(function (r) {
      if (r.error) { alert("Không lưu được agent: " + r.error.message); return; }
      if (kind === "human") { load("agents"); return; }
      if (!window.crypto || !crypto.subtle) { alert("Trình duyệt không tạo được token ở đây (cần mở trang qua https)."); return; }
      var bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
      var token = "aops_" + b64url(bytes);
      sha256Hex(token).then(function (hash) {
        return sb.from("agent_tokens").insert({ agent_id: id, token_hash: hash, label: agent.name, allow_agents: allow });
      }).then(function (r2) {
        if (r2.error) { alert("Không tạo được token: " + r2.error.message); return; }
        var out = $("tokenOut"); clear(out); out.hidden = false;
        out.appendChild(el("b", "", "Token chỉ hiện một lần. Lưu vào biến môi trường của agent:"));
        var fnUrl = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/agent-api";
        out.appendChild(el("pre", "", "AGENT_OPS_URL=" + fnUrl + "\nAGENT_OPS_TOKEN=" + token + "\nAGENT_OPS_AGENT=" + id + "\nAGENT_OPS_NAME=" + agent.name + "\nAGENT_OPS_KIND=" + kind));
        var copy = el("button", "btn", "Sao chép"); copy.type = "button";
        copy.addEventListener("click", function () { navigator.clipboard.writeText(out.querySelector("pre").textContent).then(function () { copy.textContent = "Đã chép"; }, function () {}); });
        out.appendChild(copy);
        $("agentForm").reset(); load("agents"); load("tokens");
      });
    });
  });
  function renderTokens(d) {
    var box = $("tokens"); clear(box); var list = d.tokens || [];
    if (!list.length) { empty(box, "Chưa có token nào."); return; }
    list.forEach(function (t) {
      var x = row(t.label || t.agent_id, t.agent_id, t.revoked_at ? pill("đã thu hồi", "idle") : pill("đang dùng", "ok"));
      add(x, meta([(t.allow_agents || []).length ? "báo thay: " + t.allow_agents.join(", ") : null, "tạo " + fmt(t.created_at), t.last_used_at ? "dùng " + ago(t.last_used_at) : "chưa dùng"]));
      if (!t.revoked_at) {
        var b = el("button", "btn danger", "Thu hồi"); b.type = "button";
        b.addEventListener("click", function () { if (confirm("Thu hồi token này? Agent dùng nó sẽ ngừng báo về ngay.")) sb.from("agent_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", t.id).then(function () { load("tokens"); }); });
        var acts = el("div", "actions"); acts.appendChild(b); x.appendChild(acts);
      }
      box.appendChild(x);
    });
  }
  $("adminForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    sb.from("admins").upsert({ email: $("adEmail").value.trim().toLowerCase(), role: $("adRole").value }, { onConflict: "email" }).then(function (r) {
      if (r.error) alert("Không thêm được: " + r.error.message); else { $("adminForm").reset(); load("admins"); }
    });
  });
  function renderAdmins(d) {
    var box = $("admins"); clear(box);
    (d.admins || []).forEach(function (a) {
      var x = row(a.email, null, pill(a.role, a.role === "owner" ? "ok" : "info"));
      if (a.role !== "owner") {
        var b = el("button", "btn danger", "Xoá quyền"); b.type = "button";
        b.addEventListener("click", function () { if (confirm("Xoá quyền của " + a.email + "?")) sb.from("admins").delete().eq("email", a.email).then(function () { load("admins"); }); });
        var acts = el("div", "actions"); acts.appendChild(b); x.appendChild(acts);
      }
      box.appendChild(x);
    });
  }

  sb.auth.getSession().then(function (r) { boot(r.data.session); });
})();
