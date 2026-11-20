/* Movido desde src/App.jsx sin cambios de logica (fase 3, DISENO-TRANSFORMACION.md §8.2). */
import { buildBalanceBody } from "../balanceHtml.js";
import { MATCH_FORMAT, MATCH_VERSION } from "../data/formats.js";
import { POSITIONS, POS_LABEL, fmtClock, fmtMin, groupRotations, halfLabel, halfMinutesFor, halfScore, matchHalvesPresent, resolveRosterPlayer, safeImgSrc, topCombosTogether, withCoarseZones } from "../domain/match.js";
import { GOAL_PHASES, PITCH_ZONES, POS_GROUP_COLOR } from "../domain/catalog.js";
import { pluralLabel } from "../domain/config.js";
import { REPORT as R, alpha as tint, contrastRatio, legibleOn, reportTheme } from "../brand/tokens.js";
import { BRAND } from "../brand/brand.js";
import { icon, ballIcon, cardIcon, POSITION_ICON } from "./icons.js";
// opts.summary: informe resumido (cabecera, top 5 de minutos, goles, balance y
// conclusiones), para enviar o imprimir en 1-2 paginas. El completo no cambia.
export function buildMatchReportHtml(rawMatch, teamName, rosterPlayers, teamCrest, teamColors, opts = {}) {
  const summary = !!(opts && opts.summary);
  const theme = reportTheme(teamColors);
  const match = withCoarseZones(rawMatch);
  const dateStr = new Date(match.date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const presentHalves = matchHalvesPresent(match);

  // Los nombres los escribe el usuario: un "<" en el nombre de un jugador o de
  // un rival rompia el informe entero al inyectarse crudo en el HTML.
  const esc = (v) => String(v === undefined || v === null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Paleta y tarjeta compartidas por todo el informe, para que se note como
  // un mismo sistema visual y no como secciones sueltas.
  const PAL = {
    favor: R.positive, favorBg: R.positiveBg, favorBorder: R.positiveLine,
    contra: R.negative, contraBg: R.negativeBg, contraBorder: R.negativeLine,
    blue: R.info, blueBg: R.infoBg,
    orange: R.shotOff, orangeBg: R.shotOffBg,
    amber: R.shotPost,
  };
  const SHADOW = `0 1px 3px ${tint(R.ink, 0.05)}`;
  const CARD = `border:1px solid ${R.line}; border-radius:12px; padding:12px; background:${R.bg}; box-shadow:${SHADOW};`;

  const avatarImg = (row, size = 32) => {
    const rp = resolveRosterPlayer(row, rosterPlayers);
    const photo = safeImgSrc(rp && rp.photo);
    if (photo) return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1px solid ${R.line};flex-shrink:0;" />`;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${R.track};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.36)}px;font-weight:700;color:${R.subtle};border:1px solid ${R.line};flex-shrink:0;">${esc(row.number)}</div>`;
  };

  // Donut de tarta rasterizado con <canvas> y embebido como <img> -- NO como
  // SVG (ni <circle> con stroke-dasharray, ni <path> con arcos): html2canvas
  // se ve bien en pantalla con cualquiera de las dos, pero al capturar la
  // página completa para el PDF, con muchos <path>/<circle> superpuestos en
  // el mismo radio, descarta en silencio alguno de los trazos -- el donut
  // salía como un anillo a medias o un hilo casi invisible. Un <img> ya
  // rasterizado no depende de que html2canvas interprete SVG: solo compone
  // los píxeles que ya existen.
  const donutImg = (segments, size = 120) => {
    const total = segments.reduce((s, x) => s + (x.value || 0), 0);
    const active = segments.filter((x) => (x.value || 0) > 0);
    if (!total || !active.length) return "";
    const dpr = 3; // se dibuja a 3x y se reduce por CSS, para que no se vea pixelado
    const canvas = document.createElement("canvas");
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    const cx = (size * dpr) / 2, cy = (size * dpr) / 2;
    const R = (42 / 110) * size * dpr, sw = (15 / 110) * size * dpr;
    ctx.lineWidth = sw;
    let angle = -Math.PI / 2; // 12 en punto, igual que el diseño anterior
    active.forEach((s) => {
      const sweep = (s.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.arc(cx, cy, R, angle, angle + sweep);
      ctx.stroke();
      angle += sweep;
    });
    return `<img src="${canvas.toDataURL("image/png")}" style="width:${size}px; height:${size}px; display:block; margin:0 auto;" />`;
  };

  const sectionTitle = (iconSvg, text, id) => `
    <div data-pdf-block="true"${id ? ` id="sec-${id}"` : ""} style="display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:800; color:${theme.title}; text-transform:uppercase; letter-spacing:0.5px; margin:26px 0 10px; padding-bottom:7px; border-bottom:2px solid ${R.track};">
      ${iconSvg}<span>${esc(text)}</span>
    </div>`;
  const secIcon = (name) => icon(name, { size: 16, color: theme.title });

  // Convocados de este partido si se guardaron — si no (partidos de antes de
  // que existiera la convocatoria), se enseña a toda la plantilla guardada.
  const convocadoKeys = (match.convocados || []).length
    ? new Set(match.convocados.map((c) => c.id || `${c.name}|${c.number}`))
    : null;
  const squadRows = convocadoKeys
    ? match.players.filter((p) => convocadoKeys.has(p.id) || convocadoKeys.has(`${p.name}|${p.number}`))
    : match.players;

  const rotGroups = groupRotations(match.rotations || []);
  const rotByKey = new Map();
  rotGroups.forEach((g) => { rotByKey.set(g.playerId, g); rotByKey.set(`${g.name}|${g.number}`, g); });
  const rotFor = (row) => rotByKey.get(row.id) || rotByKey.get(`${row.name}|${row.number}`) || null;

  /* ---- Minutos y rotaciones, agrupado por posición ---- */
  const minutesRow = (row) => {
    const g = rotFor(row);
    const halvesHtml = presentHalves.map((half) => {
      const h = g && g.halves.get(half);
      if (!h) return `<div style="min-width:70px; color:${R.faint}; font-size:11px;">—</div>`;
      const chips = h.list.map((r) => `${fmtClock(r.startRemaining)}→${fmtClock(r.endRemaining)} <b style="color:${R.inkSoft};">${fmtMin(r.durationSeconds)}</b>`).join(" · ");
      return `<div style="min-width:110px;">
          <div style="font-size:7.5px; color:${R.subtle}; text-transform:uppercase; font-weight:700; margin-bottom:2px;">${esc(halfLabel(half))}</div>
          <div style="display:inline-block; background:${R.ink}; color:${R.onDark}; font-size:11px; font-weight:800; border-radius:6px; padding:3px 9px; margin-bottom:3px;">${fmtMin(h.total)}</div>
          <div style="line-height:1.5; font-size:8px; color:${R.subtle};">${chips}</div>
        </div>`;
    }).join("");
    return `<div data-pdf-block="true" style="display:flex; align-items:center; gap:12px; padding:9px 12px; border-bottom:1px solid ${R.track}; break-inside:avoid;">
        ${avatarImg(row, 34)}
        <div style="min-width:100px;">
          <div style="font-size:12px; font-weight:700;">${esc(row.name)}</div>
          <div style="font-size:9px; color:${R.subtle};">#${esc(row.number)}</div>
        </div>
        <div style="display:flex; gap:16px; flex:1; flex-wrap:wrap;">${halvesHtml}</div>
        <div style="font-size:14px; font-weight:800; min-width:50px; text-align:right;">${fmtMin(row.seconds)}</div>
      </div>`;
  };

  const posHeadStyle = (pos) => `display:flex; align-items:center; gap:8px; background:${tint(POS_GROUP_COLOR[pos], 0.14)}; border-left:4px solid ${POS_GROUP_COLOR[pos]}; color:${R.ink}; font-size:11.5px; font-weight:800; letter-spacing:1px; text-transform:uppercase; padding:9px 14px;`;
  const posHead = (pos) => `${icon(POSITION_ICON[pos], { size: 15, color: POS_GROUP_COLOR[pos] })}<span>${esc(pluralLabel(POS_LABEL[pos]))}</span>`;

  const byPosition = (rowRenderer) => POSITIONS.map((pos) => {
    const rows = squadRows.filter((p) => (p.position || "ALA") === pos);
    if (!rows.length) return "";
    return `<div data-pdf-block="true" style="margin-bottom:14px; border-radius:12px; overflow:hidden; border:1px solid ${R.line}; box-shadow:0 1px 3px ${tint(R.ink, 0.05)}; break-inside:avoid;">
        <div style="${posHeadStyle(pos)}">${posHead(pos)}</div>
        <div style="background:${R.bg};">${rows.map(rowRenderer).join("")}</div>
      </div>`;
  }).join("");

  const byPositionGrid = (rowRenderer) => POSITIONS.map((pos) => {
    const rows = squadRows.filter((p) => (p.position || "ALA") === pos);
    if (!rows.length) return "";
    return `<div data-pdf-block="true" style="margin-bottom:16px;">
        <div style="${posHeadStyle(pos)} border-radius:10px; margin-bottom:10px;">${posHead(pos)}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${rows.map(rowRenderer).join("")}</div>
      </div>`;
  }).join("");

  const minutesHtml = byPosition(minutesRow);

  /* ---- Ranking de minutos en pista, sin porteros -- muy visual, para ver
     de un vistazo quién cargó más partido. ---- */
  const minutesRanking = squadRows.filter((p) => !p.isGK && (p.seconds || 0) > 0).sort((a, b) => (b.seconds || 0) - (a.seconds || 0)).slice(0, 5);
  const maxRankSeconds = Math.max(1, ...minutesRanking.map((p) => p.seconds || 0));
  const rankMedal = (i) => `<span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; font-size:10.5px; font-weight:800; ${i < 3 ? `background:${R.ink}; color:${R.onDark};` : `background:${R.track}; color:${R.muted};`}">${i + 1}</span>`;
  const minutesRankingHtml = !minutesRanking.length ? "" : `${sectionTitle(secIcon("medal"), "Top 5 · Minutos en pista", "top")}
    <div data-pdf-block="true" style="${CARD}">
      ${minutesRanking.map((p, i) => `
        <div style="display:flex; align-items:center; gap:10px; padding:7px 0; ${i < minutesRanking.length - 1 ? "border-bottom:1px solid ${R.lineSoft};" : ""}">
          <span style="width:24px; display:flex; justify-content:center;">${rankMedal(i)}</span>
          ${avatarImg(p, 32)}
          <span style="width:110px; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(p.name)}</span>
          <div style="flex:1; background:${R.track}; border-radius:7px; height:16px; overflow:hidden;"><div style="width:${((p.seconds || 0) / maxRankSeconds) * 100}%; height:100%; background:${theme.bar};"></div></div>
          <span style="width:52px; text-align:right; font-size:13px; font-weight:800;">${fmtMin(p.seconds)}</span>
        </div>`).join("")}
    </div>`;

  /* ---- Goles del partido, separados por parte, con quinteto en pista ---- */
  const goalCard = (ev) => {
    const phaseDef = GOAL_PHASES.find((p) => p.key === ev.phase);
    const phaseColor = phaseDef ? phaseDef.color : R.subtle;
    const onCourt = ev.onCourt || [];
    const isFor = ev.type === "for";
    return `<div data-pdf-block="true" style="border:1px solid ${isFor ? PAL.favorBorder : PAL.contraBorder}; background:${isFor ? PAL.favorBg : PAL.contraBg}; border-radius:10px; padding:10px 12px; margin-bottom:8px; break-inside:avoid;">
        <div style="display:flex; align-items:center; gap:7px; margin-bottom:8px;">
          <span style="background:${R.ink}; color:${R.onDark}; font-size:11px; font-weight:800; border-radius:6px; padding:3px 8px;">${fmtClock(ev.remaining !== undefined ? ev.remaining : ev.seconds)}</span>
          ${phaseDef ? `<span style="background:${phaseColor}; color:${contrastRatio(R.onDark, phaseColor) >= 3 ? R.onDark : R.ink}; font-size:8px; font-weight:800; border-radius:5px; padding:3px 7px; text-transform:uppercase; letter-spacing:0.3px;">${esc(phaseDef.label)}</span>` : ""}
        </div>
        <div style="display:flex; gap:8px; align-items:flex-start; flex-wrap:wrap;">
          ${onCourt.map((p) => {
            const isScorer = isFor && (p.id === ev.authorId || p.name === ev.authorName);
            const isAssist = isFor && ev.assistName && p.name === ev.assistName;
            const rosterRow = squadRows.find((sr) => sr.id === p.id || `${sr.name}|${sr.number}` === `${p.name}|${p.number}`);
            const badge = isScorer ? `<span style="position:absolute; bottom:-2px; right:-2px; background:${PAL.favor}; color:${R.onDark}; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; border:1.5px solid ${R.bg};">${ballIcon({ size: 9, color: R.onDark })}</span>`
              : isAssist ? `<span style="position:absolute; bottom:-2px; right:-2px; background:${PAL.blue}; color:${R.onDark}; border-radius:50%; width:13px; height:13px; font-size:7px; font-weight:800; display:flex; align-items:center; justify-content:center; border:1.5px solid ${R.bg};">A</span>`
              : (rosterRow && rosterRow.isGK) ? `<span style="position:absolute; bottom:-2px; right:-2px; background:${PAL.blue}; color:${R.onDark}; border-radius:50%; width:13px; height:13px; display:flex; align-items:center; justify-content:center; border:1.5px solid ${R.bg};">${icon("hand", { size: 8, color: R.onDark, stroke: 2.5 })}</span>` : "";
            return `<div style="text-align:center; width:38px;">
                <div style="position:relative; display:inline-block;">${avatarImg(p, 30)}${badge}</div>
                <div style="font-size:7px; color:${isScorer ? PAL.favor : R.inkSoft}; font-weight:${isScorer ? 700 : 500}; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc((p.name || "").split(" ")[0])}</div>
              </div>`;
          }).join("")}
        </div>
        <div style="font-size:10px; margin-top:7px; font-weight:700; color:${isFor ? PAL.favor : PAL.contra};">
          ${ballIcon({ size: 11, color: isFor ? PAL.favor : PAL.contra })} ${isFor ? esc(ev.authorName || (ev.ownGoal ? "Autogol del rival" : "")) : "Gol del rival"}
          ${isFor && ev.assistName ? `<span style="font-weight:600; color:${PAL.blue};"> · asist. ${esc(ev.assistName)}</span>` : ""}
        </div>
      </div>`;
  };

  const goals = match.goalEvents || [];
  const goalsByHalfHtml = presentHalves.filter((h) => goals.some((g) => g.half === h)).map((h) => {
    const sc = halfScore(match, h);
    return `<div>
        <div style="text-align:center; font-size:10px; font-weight:800; color:${R.muted}; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px; margin-bottom:10px; border-bottom:2px solid ${R.line};">${esc(halfLabel(h))} <span style="color:${R.ink};">· ${sc.favor}-${sc.contra}</span></div>
        ${goals.filter((g) => g.half === h).map(goalCard).join("")}
      </div>`;
  }).join("");

  // Donut con la fase de origen de cada gol propio -- de qué juega más nos
  // vienen los goles, de un vistazo, junto al quinteto en pista de cada uno.
  const phaseDonutHtml = (() => {
    const forGoals = goals.filter((g) => g.type === "for");
    if (!forGoals.length) return `<div style="font-size:10px; color:${R.subtle}; text-align:center;">Sin goles propios.</div>`;
    const total = forGoals.length;
    const counts = new Map();
    forGoals.forEach((g) => counts.set(g.phase, (counts.get(g.phase) || 0) + 1));
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const segsHtml = donutImg(entries.map(([phase, count]) => {
      const def = GOAL_PHASES.find((p) => p.key === phase);
      return { value: count, color: def ? def.color : R.subtle };
    }), 100);
    const legendHtml = entries.map(([phase, count]) => {
      const def = GOAL_PHASES.find((p) => p.key === phase);
      const color = def ? def.color : R.subtle;
      const label = def ? def.label : phase;
      return `<div style="display:flex; align-items:center; gap:5px; font-size:8.5px;">
          <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(label)}</span>
          <b>${count}</b>
        </div>`;
    }).join("");
    return `${segsHtml}
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">${legendHtml}</div>`;
  })();

  const goalsHtml = !goals.length ? "" : `${sectionTitle(ballIcon({ size: 16, color: theme.title }), "Goles del partido", "goles")}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">${goalsByHalfHtml}</div>
    <div data-pdf-block="true" style="${CARD} max-width:220px; margin:14px auto 0;">
      <div style="font-size:10px; font-weight:800; color:${R.muted}; text-transform:uppercase; text-align:center; margin-bottom:6px;">Fases de los goles</div>
      ${phaseDonutHtml}
    </div>`;

  /* ---- Cronología: los goles como puntos en una línea de tiempo ---- */
  // Cada parte puede durar algo distinto (la prórroga son 3 min fijos), así
  // que el minuto absoluto de un gol se calcula sumando la duración real de
  // las partes que la preceden, no multiplicando por una duración única.
  const startOfHalfMin = (h) => presentHalves.filter((x) => x < h).reduce((s, x) => s + halfMinutesFor(x, match.halfLength, match.overtimeLength), 0);
  const totalMin = Math.max(1, presentHalves.reduce((s, h) => s + halfMinutesFor(h, match.halfLength, match.overtimeLength), 0));
  const timelineHtml = !goals.length ? "" : (() => {
    const W = 720, H = 130, pad = 30;
    const minToX = (min) => pad + (min / totalMin) * (W - pad * 2);
    const points = goals.map((ev) => {
      const elapsedInHalf = Math.max(0, halfMinutesFor(ev.half, match.halfLength, match.overtimeLength) * 60 - (ev.remaining !== undefined ? ev.remaining : 0));
      const minuteAbs = startOfHalfMin(ev.half) + elapsedInHalf / 60;
      return { ev, minute: Math.max(0, Math.min(totalMin, minuteAbs)) };
    }).sort((a, b) => a.minute - b.minute);
    const dotsHtml = points.map((pt, i) => {
      const x = minToX(pt.minute);
      const above = i % 2 === 0;
      const isFor = pt.ev.type === "for";
      const color = isFor ? PAL.favor : PAL.contra;
      const labelY = above ? 20 : H - 32;
      const timeY = above ? 32 : H - 44;
      const lineY1 = above ? 26 : H - 26;
      return `
        <line x1="${x}" y1="${lineY1}" x2="${x}" y2="${H / 2}" stroke="${R.line}" stroke-width="1" />
        <circle cx="${x}" cy="${H / 2}" r="5" fill="${color}" />
        <text x="${x}" y="${labelY}" text-anchor="middle" font-size="8" font-weight="700" fill="${isFor ? R.ink : PAL.contra}">${esc(isFor ? (pt.ev.authorName || "") : "En contra")}</text>
        <text x="${x}" y="${timeY}" text-anchor="middle" font-size="7" fill="${R.subtle}">${fmtMin(Math.round(pt.minute * 60))}</text>`;
    }).join("");
    const breaksHtml = presentHalves.slice(1).map((h) => {
      const x = minToX(startOfHalfMin(h));
      return `<circle cx="${x}" cy="${H / 2}" r="3" fill="${R.faint}" />
        <text x="${x}" y="${H / 2 + 18}" text-anchor="middle" font-size="8" fill="${R.subtle}">${esc(h > 2 ? "Prórroga" : "Descanso")}</text>`;
    }).join("");
    return `${sectionTitle(secIcon("time"), "Cronología", "cronologia")}
      <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;">
        <line x1="${pad}" y1="${H / 2}" x2="${W - pad}" y2="${H / 2}" stroke="${R.faint}" stroke-width="1.5" />
        ${breaksHtml}
        <text x="${pad}" y="${H - 6}" font-size="8" fill="${R.subtle}">0'</text>
        <text x="${W - pad}" y="${H - 6}" text-anchor="end" font-size="8" fill="${R.subtle}">${totalMin}'</text>
        ${dotsHtml}
      </svg>`;
  })();

  /* ---- Presencia en pista: goles con cada uno dentro, y con quién más minutos junto ---- */
  const onCourtGoalStats = new Map();
  goals.forEach((ev) => {
    (ev.onCourt || []).forEach((p) => {
      const key = p.id || `${p.name}|${p.number}`;
      if (!onCourtGoalStats.has(key)) onCourtGoalStats.set(key, { ...p, favor: 0, contra: 0 });
      const d = onCourtGoalStats.get(key);
      if (ev.type === "for") d.favor++; else d.contra++;
    });
  });
  const presenceRows = [...onCourtGoalStats.values()].sort((a, b) => (b.favor + b.contra) - (a.favor + a.contra));
  const maxPresenceSide = Math.max(1, ...presenceRows.map((r) => Math.max(r.favor, r.contra)));
  // Barra divergente desde el centro -- roja hacia la izquierda (en contra),
  // verde hacia la derecha (a favor), como un saldo visual de un vistazo.
  const presenceHtml = !presenceRows.length ? `<div style="font-size:10px; color:${R.subtle};">Sin goles registrados.</div>` : presenceRows.map((r) => {
    const net = r.favor - r.contra;
    const leftPct = (r.contra / maxPresenceSide) * 100;
    const rightPct = (r.favor / maxPresenceSide) * 100;
    return `<div style="display:flex; align-items:center; gap:8px; padding:5px 0; font-size:10px;">
        ${avatarImg(r, 22)}
        <span style="width:66px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">${esc((r.name || "").split(" ")[0])}</span>
        <span style="width:24px; text-align:right; font-size:10px; font-weight:800; color:${net >= 0 ? PAL.favor : PAL.contra};">${net > 0 ? `+${net}` : net}</span>
        <div style="flex:1; display:flex; align-items:center; height:13px;">
          <div style="flex:1; display:flex; justify-content:flex-end;"><div style="width:${leftPct}%; background:${PAL.contra}; height:100%; border-radius:3px 0 0 3px; display:flex; align-items:center; justify-content:flex-start; padding-left:3px;">${r.contra ? `<span style="font-size:8px; color:${R.onDark}; font-weight:700;">${r.contra}</span>` : ""}</div></div>
          <div style="width:1px; height:100%; background:${R.line};"></div>
          <div style="flex:1; display:flex; justify-content:flex-start;"><div style="width:${rightPct}%; background:${PAL.favor}; height:100%; border-radius:0 3px 3px 0; display:flex; align-items:center; justify-content:flex-end; padding-right:3px;">${r.favor ? `<span style="font-size:8px; color:${R.onDark}; font-weight:700;">${r.favor}</span>` : ""}</div></div>
        </div>
      </div>`;
  }).join("");

  // Foto y nombre de cada combinación, con el mismo lenguaje visual que ya
  // usa el quinteto en pista de cada gol.
  const rowOf = (id) => {
    const g = rotGroups.find((x) => x.playerId === id);
    return g ? { id, name: g.name, number: g.number } : { id, name: "?", number: "?" };
  };
  const comboRow = (combo, seconds) => `<div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid ${R.lineSoft};">
        <div style="display:flex; gap:4px; flex:1; flex-wrap:wrap;">
          ${combo.map((id) => {
            const row = rowOf(id);
            return `<div style="text-align:center; width:34px;">
                ${avatarImg(row, 26)}
                <div style="font-size:7px; color:${R.muted}; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc((row.name || "").split(" ")[0])}</div>
              </div>`;
          }).join("")}
        </div>
        <span style="font-weight:700; color:${PAL.blue}; flex-shrink:0; font-size:11px;">${fmtMin(seconds)}</span>
      </div>`;
  // Los porteros no cuentan para "más minutos juntos" -- casi siempre están
  // los 40 minutos en pista sin que eso diga nada táctico, y dominarían
  // todas las combinaciones.
  const gkIds = new Set(squadRows.filter((p) => p.isGK).map((p) => p.id));
  const outfieldRotations = (match.rotations || []).filter((r) => !gkIds.has(r.playerId));
  const pairs = topCombosTogether(outfieldRotations, 2, 4);
  const trios = topCombosTogether(outfieldRotations, 3, 4);
  const quartets = topCombosTogether(outfieldRotations, 4, 4);
  const pairingHtml = (!pairs.length && !trios.length && !quartets.length) ? `<div style="font-size:10px; color:${R.subtle};">No hay suficientes rotaciones para calcularlo.</div>` : `
      ${pairs.length ? `<div style="font-size:9px; font-weight:700; color:${R.subtle}; text-transform:uppercase; margin:6px 0 2px;">Parejas</div>${pairs.map((r) => comboRow(r.combo, r.seconds)).join("")}` : ""}
      ${trios.length ? `<div style="font-size:9px; font-weight:700; color:${R.subtle}; text-transform:uppercase; margin:6px 0 2px;">Tríos</div>${trios.map((r) => comboRow(r.combo, r.seconds)).join("")}` : ""}
      ${quartets.length ? `<div style="font-size:9px; font-weight:700; color:${R.subtle}; text-transform:uppercase; margin:6px 0 2px;">Cuartetos</div>${quartets.map((r) => comboRow(r.combo, r.seconds)).join("")}` : ""}`;

  const presenceSectionHtml = (!presenceRows.length && !pairs.length && !trios.length && !quartets.length) ? "" : `${sectionTitle(secIcon("users"), "Presencia en pista", "presencia")}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
      <div data-pdf-block="true" style="${CARD}">
        <div style="font-size:10px; font-weight:700; color:${R.subtle}; text-transform:uppercase; margin-bottom:8px;">Goles en pista <span style="color:${PAL.contra};">en contra</span> · <span style="color:${PAL.favor};">a favor</span></div>
        ${presenceHtml}
      </div>
      <div data-pdf-block="true" style="${CARD}">
        <div style="font-size:10px; font-weight:700; color:${R.subtle}; text-transform:uppercase;">Más minutos juntos</div>
        ${pairingHtml}
      </div>
    </div>`;

  /* ---- Balance más/menos de todos los convocados ---- */
  const balanceSectionHtml = `${sectionTitle(secIcon("plusMinus"), "Balance más/menos", "balance")}${buildBalanceBody(match)}`;

  /* ---- Campogramas: dónde pasó cada tiro, pérdida y recuperación. Estático
     a propósito (sin desplegable ni JavaScript): un jugador con varias
     acciones en la misma zona sale una vez, como texto, sobre el dibujo de
     la pista -- así se ve todo de un vistazo y no complica rasterizar la
     página para el PDF. ---- */
  const zoneLinesFor = (events, color) => {
    const byZone = new Map();
    events.forEach((ev) => {
      if (!byZone.has(ev.zone)) byZone.set(ev.zone, new Map());
      const byPlayer = byZone.get(ev.zone);
      const key = ev.playerId || ev.playerName;
      const cur = byPlayer.get(key) || { name: ev.playerName, count: 0 };
      cur.count++;
      byPlayer.set(key, cur);
    });
    return PITCH_ZONES.map((z) => {
      const byPlayer = byZone.get(z.key);
      if (!byPlayer) return [];
      return [...byPlayer.values()].map((v) => `<div style="font-size:6.5px; font-weight:700; color:${legibleOn(color, R.courtA)}; line-height:1.3;">${esc((v.name || "").split(" ")[0])} ×${v.count}</div>`);
    });
  };
  const zoneCell = (linesHtml) => `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; text-align:center; overflow:hidden; padding:1px;">${linesHtml.join("")}</div>`;
  const courtLinesSvg = () => `
    <svg viewBox="0 0 100 120" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
      <line x1="0" y1="60" x2="100" y2="60" stroke="${R.courtLine}" stroke-width="0.7" />
      <circle cx="50" cy="60" r="11" fill="none" stroke="${R.courtLine}" stroke-width="0.7" />
      <rect x="28" y="0" width="44" height="7" fill="none" stroke="${R.courtLine}" stroke-width="0.7" />
      <rect x="28" y="113" width="44" height="7" fill="none" stroke="${R.courtLine}" stroke-width="0.7" />
      <line x1="0" y1="40" x2="100" y2="40" stroke="${R.courtGrid}" stroke-width="0.5" stroke-dasharray="1.6 1.6" />
      <line x1="0" y1="80" x2="100" y2="80" stroke="${R.courtGrid}" stroke-width="0.5" stroke-dasharray="1.6 1.6" />
      <line x1="33.33" y1="0" x2="33.33" y2="120" stroke="${R.courtGrid}" stroke-width="0.5" stroke-dasharray="1.6 1.6" />
      <line x1="66.66" y1="0" x2="66.66" y2="120" stroke="${R.courtGrid}" stroke-width="0.5" stroke-dasharray="1.6 1.6" />
    </svg>`;
  const courtFrame = (cellsHtml) => `
    <div style="position:relative; border:1.5px solid ${R.courtBorder}; border-radius:12px; overflow:hidden; background:repeating-linear-gradient(90deg,${R.courtA} 0,${R.courtA} 12.5%,${R.courtB} 12.5%,${R.courtB} 25%); aspect-ratio:1/1.2; max-width:230px; margin:0 auto;">
      ${courtLinesSvg()}
      ${safeImgSrc(teamCrest) ? `<img src="${safeImgSrc(teamCrest)}" style="position:absolute; top:50%; left:50%; width:24%; transform:translate(-50%,-50%); opacity:0.15;" />` : ""}
      <div style="position:absolute; left:2px; top:8px; bottom:8px; display:flex; align-items:center; z-index:2; pointer-events:none;">
        <span style="writing-mode:vertical-rl; font-size:6.5px; font-weight:800; letter-spacing:1.4px; color:${R.courtLabel}; white-space:nowrap;">▲ ATAQUE</span>
      </div>
      <div style="position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr 1fr; grid-auto-rows:1fr; height:100%; padding:3px 3px 3px 15px; box-sizing:border-box;">
        ${cellsHtml}
      </div>
    </div>`;
  const pitchCard = (label, color, bg, events) => {
    const cellsHtml = zoneLinesFor(events, color).map(zoneCell).join("");
    return `<div data-pdf-block="true">
        <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:8px;">
          <span style="font-size:10px; font-weight:800; color:${legibleOn(color)}; text-transform:uppercase; letter-spacing:0.4px;">${esc(label)}</span>
          <span style="background:${bg}; color:${color}; font-size:9px; font-weight:800; border-radius:9px; padding:1px 7px;">${events.length}</span>
        </div>
        ${courtFrame(cellsHtml)}
      </div>`;
  };

  const turnoverEvents = (match.zonedEvents || []).filter((ev) => ev.key === "turnovers");
  const recoveryEvents = (match.zonedEvents || []).filter((ev) => ev.key === "recoveries");
  const shotOnEvents = (match.zonedEvents || []).filter((ev) => ev.key === "shotsOn");
  const shotOffEvents = (match.zonedEvents || []).filter((ev) => ev.key === "shotsOff");
  const shotPostEvents = (match.zonedEvents || []).filter((ev) => ev.key === "shotsPost");
  // La zona de finalización de los propios goles (si se marcó al anotarlos)
  // se pinta como un campograma más, junto a los otros dos tipos de tiro.
  const goalZoneEvents = (match.goalEvents || []).filter((ev) => ev.type === "for" && ev.zone).map((ev) => {
    const onCourtRow = (ev.onCourt || []).find((p) => p.id === ev.authorId);
    return { zone: ev.zone, playerId: ev.authorId, playerName: ev.authorName, playerNumber: onCourtRow ? onCourtRow.number : "?", half: ev.half, remaining: ev.remaining };
  });

  /* ---- Tiros: por jugador, proporción a puerta/fuera/palo/gol, campogramas ---- */
  const shooters = squadRows.filter((p) => (p.shotsOn || 0) + (p.shotsOff || 0) + (p.shotsPost || 0) + (p.goals || 0) > 0)
    .sort((a, b) => ((b.shotsOn || 0) + (b.shotsOff || 0) + (b.shotsPost || 0) + (b.goals || 0)) - ((a.shotsOn || 0) + (a.shotsOff || 0) + (a.shotsPost || 0) + (a.goals || 0)));

  const shotsByPlayerHtml = shooters.map((p) => {
    const total = (p.shotsOn || 0) + (p.shotsOff || 0) + (p.shotsPost || 0) + (p.goals || 0);
    const badge = (label, val, color) => val ? `<span style="color:${legibleOn(color)}; font-weight:700; margin-right:6px;">${label}×${val}</span>` : "";
    return `<div data-pdf-block="true" style="display:flex; align-items:center; gap:8px; padding:5px 0; break-inside:avoid;">
        ${avatarImg(p, 26)}
        <div style="flex:1; min-width:0;">
          <div style="font-size:11px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(p.name)}</div>
          <div style="font-size:8.5px;">${badge("P", p.shotsOn, PAL.blue)}${badge("F", p.shotsOff, PAL.orange)}${badge("T", p.shotsPost, PAL.amber)}${badge("G", p.goals, PAL.favor)}</div>
        </div>
        <span style="font-size:15px; font-weight:800;">${total}</span>
      </div>`;
  }).join("");

  const totShotsOn = squadRows.reduce((s, p) => s + (p.shotsOn || 0), 0);
  const totShotsOff = squadRows.reduce((s, p) => s + (p.shotsOff || 0), 0);
  const totShotsPost = squadRows.reduce((s, p) => s + (p.shotsPost || 0), 0);
  const totGoals = squadRows.reduce((s, p) => s + (p.goals || 0), 0);
  const totShots = totShotsOn + totShotsOff + totShotsPost + totGoals;

  const donutHtml = (() => {
    if (!totShots) return `<div style="font-size:10px; color:${R.subtle}; text-align:center;">Sin tiros registrados.</div>`;
    const segsHtml = donutImg([
      { value: totShotsOn, color: PAL.blue },
      { value: totShotsOff, color: PAL.orange },
      { value: totShotsPost, color: PAL.amber },
      { value: totGoals, color: PAL.favor },
    ], 120);
    return `${segsHtml}
      <div style="display:flex; flex-direction:column; gap:4px; font-size:9px; margin-top:10px;">
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL.blue};"></span> A puerta: <b>${totShotsOn}</b> (${Math.round((totShotsOn / totShots) * 100)}%)</span>
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL.orange};"></span> Fuera: <b>${totShotsOff}</b> (${Math.round((totShotsOff / totShots) * 100)}%)</span>
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL.amber};"></span> Al palo: <b>${totShotsPost}</b> (${Math.round((totShotsPost / totShots) * 100)}%)</span>
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL.favor};"></span> Gol: <b>${totGoals}</b> (${Math.round((totGoals / totShots) * 100)}%)</span>
      </div>`;
  })();

  const incidenceHtml = (() => {
    const allShots = [...shotOnEvents, ...shotOffEvents, ...shotPostEvents, ...goalZoneEvents];
    if (!allShots.length) return "";
    const rowCounts = [0, 0, 0];
    allShots.forEach((ev) => { const z = PITCH_ZONES.find((zz) => zz.key === ev.zone); if (z) rowCounts[z.row]++; });
    const total = allShots.length;
    const cellsHtml = [0, 1, 2].map((r) => {
      const pct = Math.round((rowCounts[r] / total) * 100);
      const heat = (0.15 + (pct / 100) * 0.65).toFixed(2);
      return `<div style="grid-column:1 / 4; display:flex; align-items:center; justify-content:center; background:${tint(R.negative, heat)};">
          <span style="font-size:17px; font-weight:800; color:${pct >= 45 ? R.onDark : R.negative};">${pct}%</span>
        </div>`;
    }).join("");
    return `<div data-pdf-block="true">
        <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:8px;">
          <span style="font-size:10px; font-weight:800; color:${PAL.contra}; text-transform:uppercase; letter-spacing:0.4px;">% Incidencia de tiro</span>
          <span style="background:${PAL.contraBg}; color:${PAL.contra}; font-size:9px; font-weight:800; border-radius:9px; padding:1px 7px;">${total}</span>
        </div>
        ${courtFrame(cellsHtml)}
      </div>`;
  })();

  const shotsHtml = !totShots ? "" : `${sectionTitle(secIcon("target"), "Tiros", "tiros")}
    <div style="display:grid; grid-template-columns:1.3fr 1fr; gap:14px; margin-bottom:14px; align-items:start;">
      <div data-pdf-block="true" style="${CARD}"><div style="column-count:2; column-gap:16px;">${shotsByPlayerHtml}</div></div>
      <div data-pdf-block="true" style="${CARD}">
        <div style="font-size:10px; font-weight:800; color:${R.muted}; text-transform:uppercase; text-align:center; margin-bottom:6px;">Distribución</div>
        ${donutHtml}
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:14px;">
      ${pitchCard("Tiros a puerta", PAL.blue, PAL.blueBg, shotOnEvents)}
      ${pitchCard("Tiros fuera", PAL.orange, PAL.orangeBg, shotOffEvents)}
      ${pitchCard("Tiros al palo", R.warning, R.shotPostBg, shotPostEvents)}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
      ${pitchCard("Goles", PAL.favor, PAL.favorBg, goalZoneEvents)}
      ${incidenceHtml}
    </div>`;

  /* ---- Pérdidas y recuperaciones -- cada cosa en su propio dashboard ---- */
  const discByPlayer = new Map();
  (match.disciplineEvents || []).forEach((ev) => {
    const key = ev.playerId || `${ev.playerName}|${ev.playerNumber}`;
    if (!discByPlayer.has(key)) discByPlayer.set(key, { id: ev.playerId, name: ev.playerName, number: ev.playerNumber, fouls: 0, foulsReceived: 0, yellowHalves: [], redHalves: [] });
    const d = discByPlayer.get(key);
    if (ev.type === "fouls") d.fouls++;
    else if (ev.type === "foulsReceived") d.foulsReceived++;
    else if (ev.type === "yellow") d.yellowHalves.push(ev.half);
    else if (ev.type === "red") d.redHalves.push(ev.half);
  });

  const totalRecoveries = squadRows.reduce((s, p) => s + (p.recoveries || 0), 0);
  const totalTurnovers = squadRows.reduce((s, p) => s + (p.turnovers || 0), 0);

  const recTurnDonutHtml = (() => {
    const total = totalRecoveries + totalTurnovers;
    if (!total) return `<div style="font-size:10px; color:${R.subtle}; text-align:center;">Sin registros.</div>`;
    const segsHtml = donutImg([
      { value: totalTurnovers, color: PAL.contra },
      { value: totalRecoveries, color: PAL.favor },
    ], 120);
    return `${segsHtml}
      <div style="display:flex; flex-direction:column; gap:4px; font-size:9px; margin-top:10px;">
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL.favor};"></span> Recuperaciones: <b>${totalRecoveries}</b> (${Math.round((totalRecoveries / total) * 100)}%)</span>
        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PAL.contra};"></span> Pérdidas: <b>${totalTurnovers}</b> (${Math.round((totalTurnovers / total) * 100)}%)</span>
      </div>`;
  })();

  const recPerRows = squadRows.filter((p) => (p.recoveries || 0) + (p.turnovers || 0) > 0)
    .sort((a, b) => ((b.recoveries || 0) + (b.turnovers || 0)) - ((a.recoveries || 0) + (a.turnovers || 0)));
  const recPerTableHtml = !recPerRows.length ? `<div style="font-size:10px; color:${R.subtle};">Sin registros.</div>` : `
    <div style="display:flex; font-size:8px; font-weight:800; color:${R.subtle}; text-transform:uppercase; padding:0 0 6px; border-bottom:1px solid ${R.line}; margin-bottom:4px;">
      <span style="flex:1;">Jugador</span><span style="width:34px; text-align:center; color:${PAL.favor};">Rec</span><span style="width:34px; text-align:center; color:${PAL.contra};">Pér</span>
    </div>
    ${recPerRows.map((p) => `<div data-pdf-block="true" style="display:flex; align-items:center; gap:7px; padding:4px 0; font-size:10px;">
        ${avatarImg(p, 20)}<span style="flex:1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(p.name)}</span>
        <span style="width:34px; text-align:center; font-weight:800; color:${PAL.favor};">${p.recoveries || 0}</span>
        <span style="width:34px; text-align:center; font-weight:800; color:${PAL.contra};">${p.turnovers || 0}</span>
      </div>`).join("")}`;

  const zonePctLinesFor = (events, total, label, color) => {
    const byZone = new Map();
    events.forEach((ev) => byZone.set(ev.zone, (byZone.get(ev.zone) || 0) + 1));
    return PITCH_ZONES.map((z) => {
      const c = byZone.get(z.key) || 0;
      if (!c) return "";
      const pct = total ? Math.round((c / total) * 100) : 0;
      return `<div style="font-size:6.5px; font-weight:800; color:${color}; line-height:1.3;">${label} ${c}·${pct}%</div>`;
    });
  };
  const recZoneLines = zonePctLinesFor(recoveryEvents, totalRecoveries, "R", PAL.favor);
  const turnZoneLines = zonePctLinesFor(turnoverEvents, totalTurnovers, "P", PAL.contra);
  const zonePctCellsHtml = PITCH_ZONES.map((z, i) => zoneCell([recZoneLines[i], turnZoneLines[i]].filter(Boolean))).join("");

  const foulsAndCardsRows = [...discByPlayer.values()].filter((d) => d.fouls || d.foulsReceived || d.yellowHalves.length || d.redHalves.length)
    .sort((a, b) => (b.fouls + b.foulsReceived + b.yellowHalves.length + b.redHalves.length) - (a.fouls + a.foulsReceived + a.yellowHalves.length + a.redHalves.length));
  const foulsAndCardsHtml = !foulsAndCardsRows.length ? `<div style="font-size:10px; color:${R.subtle};">Sin faltas ni tarjetas.</div>` : foulsAndCardsRows.map((d) => `
      <div data-pdf-block="true" style="display:flex; align-items:center; gap:8px; padding:5px 0; font-size:10px;">
        ${avatarImg(d, 22)}
        <span style="flex:1; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(d.name)}</span>
        ${d.fouls ? `<span style="display:inline-flex; align-items:center; gap:2px; color:${PAL.contra}; font-weight:700;" title="Faltas cometidas">${icon("foulOut", { size: 11, color: PAL.contra })}${d.fouls}</span>` : ""}
        ${d.foulsReceived ? `<span style="display:inline-flex; align-items:center; gap:2px; color:${PAL.favor}; font-weight:700;" title="Faltas recibidas">${icon("foulIn", { size: 11, color: PAL.favor })}${d.foulsReceived}</span>` : ""}
        ${d.yellowHalves.map(() => cardIcon(R.yellowCard, { size: 12 })).join("")}
        ${d.redHalves.map(() => cardIcon(R.redCard, { size: 12 })).join("")}
      </div>`).join("");

  // Faltas con zona -- ya quedan registradas con zona al anotarlas (mismo
  // asistente en tres pasos que tiros o pérdidas), así que salen con el
  // mismo formato de campograma por jugador, cometidas y recibidas.
  const foulsCommittedZoned = (match.disciplineEvents || []).filter((ev) => ev.type === "fouls" && ev.zone);
  const foulsReceivedZoned = (match.disciplineEvents || []).filter((ev) => ev.type === "foulsReceived" && ev.zone);

  const turnoverRecoverySectionHtml = (!turnoverEvents.length && !recoveryEvents.length && !foulsAndCardsRows.length) ? "" : `${sectionTitle(secIcon("repeat"), "Pérdidas y recuperaciones", "perdidas")}
    <div style="display:grid; grid-template-columns:1fr 1.3fr; gap:14px; margin-bottom:14px;">
      <div data-pdf-block="true" style="${CARD}">${recTurnDonutHtml}</div>
      <div data-pdf-block="true" style="${CARD}">${recPerTableHtml}</div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
      <div data-pdf-block="true" style="${CARD}">
        <div style="font-size:10px; font-weight:800; color:${R.muted}; text-transform:uppercase; text-align:center; margin-bottom:8px;">% por zona</div>
        ${courtFrame(zonePctCellsHtml)}
      </div>
      <div data-pdf-block="true" style="${CARD}">
        <div style="font-size:10px; font-weight:800; color:${R.muted}; text-transform:uppercase; margin-bottom:8px;">Faltas y amarillas</div>
        ${foulsAndCardsHtml}
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
      ${pitchCard("Pérdidas", PAL.contra, PAL.contraBg, turnoverEvents)}
      ${pitchCard("Recuperaciones", PAL.favor, PAL.favorBg, recoveryEvents)}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
      ${pitchCard("Faltas cometidas", PAL.contra, PAL.contraBg, foulsCommittedZoned)}
      ${pitchCard("Faltas recibidas", PAL.favor, PAL.favorBg, foulsReceivedZoned)}
    </div>`;

  /* ---- Fichas de jugadores, agrupado por posición ---- */
  const statPill = (icon, val, color, bg) => val ? `<span style="display:inline-flex; align-items:center; gap:3px; background:${bg}; color:${color}; font-weight:800; border-radius:5px; padding:2px 6px; font-size:9px; margin-right:5px;">${icon} ${val}</span>` : "";
  // Goles encajados mientras este portero estaba en pista -- se cruza el
  // minuto del gol en contra con sus tramos de rotación de esa parte.
  const concededBy = (row) => {
    const g = rotFor(row);
    if (!g) return 0;
    let n = 0;
    (match.goalEvents || []).filter((ev) => ev.type === "against").forEach((ev) => {
      const h = g.halves.get(ev.half);
      if (!h) return;
      if (h.list.some((iv) => ev.remaining <= iv.startRemaining && ev.remaining >= iv.endRemaining)) n++;
    });
    return n;
  };
  // Acciones de portero anotadas (solo las que tengan algo).
  const gkLine = (row) => {
    const items = [["1x1 ganados", row.gkOneVsOne], ["Salidas / cortes", row.gkInterceptions], ["Saques buenos", row.gkDistOk], ["Saques fallados", row.gkDistBad]].filter(([, v]) => v > 0);
    return items.length ? `<div style="font-size:8.5px; color:${R.inkSoft}; margin:3px 0 2px;">${items.map(([l, v]) => `${esc(l)} <b>${v}</b>`).join(" · ")}</div>` : "";
  };
  const fichaCard = (row) => {
    const g = rotFor(row);
    const halvesHtml = presentHalves.map((half) => {
      const h = g && g.halves.get(half);
      if (!h) return "";
      const chips = h.list.map((r) => `${fmtClock(r.startRemaining)}→${fmtClock(r.endRemaining)} <b>${fmtMin(r.durationSeconds)}</b>`).join(" · ");
      return `<div style="font-size:8.5px; color:${R.muted}; margin-bottom:2px;"><b style="color:${R.inkSoft};">${esc(halfLabel(half))}:</b> ${chips || "—"}</div>`;
    }).join("");
    const nameRow = row.isGK ? `<div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div style="font-size:12.5px; font-weight:800;">#${esc(row.number)} ${esc(row.name)}</div>
          <div style="display:flex; gap:12px; text-align:center; flex-shrink:0;">
            <div><div style="font-size:16px; font-weight:800; color:${PAL.favor};">${row.saves || 0}</div><div style="font-size:6px; color:${R.subtle}; text-transform:uppercase; font-weight:700;">Paradas</div></div>
            <div><div style="font-size:16px; font-weight:800; color:${PAL.contra};">${concededBy(row)}</div><div style="font-size:6px; color:${R.subtle}; text-transform:uppercase; font-weight:700;">Encajados</div></div>
          </div>
        </div>${gkLine(row)}` : `<div style="font-size:12.5px; font-weight:800;">#${esc(row.number)} ${esc(row.name)}</div>`;
    return `<div data-pdf-block="true" style="border:1px solid ${R.line}; border-radius:11px; padding:11px; display:flex; gap:11px; align-items:flex-start; background:${R.bg}; break-inside:avoid;">
        ${avatarImg(row, 42)}
        <div style="flex:1; min-width:0;">
          ${nameRow}
          ${halvesHtml}
          <div style="margin-top:4px;">
            ${statPill(ballIcon({ size: 10, color: PAL.favor }), row.goals, PAL.favor, PAL.favorBg)}${statPill("A", row.assists, PAL.blue, PAL.blueBg)}${statPill(cardIcon(R.yellowCard, { size: 10 }), row.yellow, R.yellowInk, R.shotPostBg)}${statPill(cardIcon(R.redCard, { size: 10 }), row.red, R.redCard, R.redCardBg)}${statPill(icon("alert", { size: 10, color: PAL.contra }), row.fouls, PAL.contra, PAL.contraBg)}
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:15px; font-weight:800;">${fmtMin(row.seconds)}</div>
          <div style="font-size:7px; color:${R.subtle}; text-transform:uppercase; font-weight:700;">Total</div>
        </div>
      </div>`;
  };
  const fichasHtml = byPositionGrid(fichaCard);

  const halvesScoreLine = presentHalves.map((h) => { const sc = halfScore(match, h); return `${esc(halfLabel(h))}: ${sc.favor}-${sc.contra}`; }).join(" · ");

  // Datos de cabecera que se piden al pulsar "Crear informe" (ciudad, hora de
  // fin, material de la pista, competición) — se muestran como una línea de
  // chips discretos dentro de la propia cabecera, para que se noten a
  // simple vista sin competir con el marcador. Opcionales: solo aparece el
  // chip de lo que de verdad se rellenó.
  const hours = match.startTime || match.endTime ? `${esc(match.startTime || "?")}–${esc(match.endTime || "?")}` : null;
  const metaChip = (iconName, text) => (text ? `<span style="display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:600; color:${tint(theme.onHeader, 0.85)};">${icon(iconName, { size: 12, color: tint(theme.onHeader, 0.85) })} ${esc(text)}</span>` : "");
  const metaLine = [metaChip("calendar", dateStr), metaChip("time", hours), metaChip("pin", match.city), metaChip("venue", match.venue), metaChip("layers", match.pitchMaterial)].filter(Boolean);
  const competitionLabel = match.competition ? esc(match.competition).toUpperCase() : "PARTIDO";

  const headerHtml = `
    <div style="background:${theme.header}; border-radius:${theme.stripe ? "14px 14px 0 0" : "14px"}; padding: 18px 22px; color:${theme.onHeader}; margin-bottom:${theme.stripe ? 0 : 12}px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:48px; height:48px; border-radius:11px; background:${R.bg}; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            ${safeImgSrc(teamCrest) ? `<img src="${safeImgSrc(teamCrest)}" style="width:100%; height:100%; object-fit:cover;" />` : icon("shield", { size: 24, color: R.subtle })}
          </div>
          <div>
            <div style="font-size:18px; font-weight:800; line-height:1.2;">${esc(teamName || "Equipo")}</div>
            <div style="font-size:10px; opacity:0.8;">${summary ? "Informe resumido" : "Informe de partido"}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9.5px; font-weight:700; letter-spacing:1px; opacity:0.75; text-transform:uppercase; margin-bottom:6px;">${competitionLabel} · ${esc(dateStr)}</div>
          <div style="display:flex; align-items:center; gap:10px; justify-content:flex-end;">
            <span style="font-size:14px; font-weight:700;">${esc(teamName || "Equipo")}</span>
            <span style="background:${R.bg}; color:${R.ink}; border-radius:9px; padding:5px 14px; font-size:18px; font-weight:800; letter-spacing:0.5px;">${esc(match.teamGoals)} - ${esc(match.rivalScore)}</span>
            <span style="font-size:14px; font-weight:700;">${esc(match.rivalName || "Rival")}</span>
            ${safeImgSrc(match.rivalCrest) ? `<img src="${safeImgSrc(match.rivalCrest)}" style="width:26px; height:26px; border-radius:6px; object-fit:cover; background:${R.bg};" />` : ""}
          </div>
        </div>
      </div>
      ${metaLine.length ? `<div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:14px; padding-top:12px; border-top:1px solid ${tint(theme.onHeader, 0.25)};">${metaLine.join("")}</div>` : ""}
    </div>
    ${theme.stripe ? `<div style="height:4px; background:${theme.stripe}; border-radius:0 0 4px 4px; margin-bottom:12px;"></div>` : ""}
    <div style="font-size:10px; color:${R.muted}; margin-bottom:6px;">
      ${halvesScoreLine} · Duración parte: ${esc(match.halfLength)} min
    </div>
    ${match.observations ? `<div style="background:${R.warningBg}; border:1px solid ${R.warningLine}; border-radius:8px; padding:8px 12px; font-size:10px; color:${R.inkSoft}; margin-bottom:10px;"><b style="color:${R.ink};">Observaciones:</b> ${esc(match.observations)}</div>` : ""}`;

  // Conclusiones del partido (texto libre del cuerpo técnico, opcional).
  const conclusionsHtml = !String(match.conclusions || "").trim() ? "" : `${sectionTitle(secIcon("list"), "Conclusiones", "conclusiones")}
    <div data-pdf-block="true" style="border:1px solid ${R.line}; border-left:4px solid ${theme.bar}; border-radius:10px; padding:12px 14px; font-size:11px; line-height:1.55; color:${R.inkSoft}; white-space:pre-wrap; margin-bottom:12px;">${esc(String(match.conclusions).trim())}</div>`;
  const contents = (summary
    ? [["Top 5 minutos", minutesRankingHtml], ["Goles", goalsHtml], ["Balance más/menos", true], ["Conclusiones", conclusionsHtml]]
    : [["Minutos y rotaciones", true], ["Top 5 minutos", minutesRankingHtml], ["Goles", goalsHtml], ["Cronología", timelineHtml], ["Presencia en pista", presenceSectionHtml],
      ["Balance más/menos", true], ["Tiros", shotsHtml], ["Pérdidas y recuperaciones", turnoverRecoverySectionHtml], ["Conclusiones", conclusionsHtml], ["Fichas", true]]
  ).filter(([, on]) => on).map(([label]) => label);
  const contentsHtml = `<div data-pdf-block="true" style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:4px 0 2px; font-size:9.5px; color:${R.muted};">
      <span style="display:inline-flex; align-items:center; gap:4px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${icon("list", { size: 11, color: R.muted })} En este informe</span>
      ${contents.map((c) => `<span style="border:1px solid ${R.line}; border-radius:999px; padding:2px 8px; color:${R.inkSoft}; font-weight:600;">${esc(c)}</span>`).join("")}
    </div>`;
  const footerHtml = `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:26px; padding-top:10px; border-top:1px solid ${R.line}; font-size:9px; color:${R.subtle};">
      <span>${esc(teamName || "Equipo")} · ${esc(match.rivalName || "Rival")} · ${esc(dateStr)}</span>
      <span style="display:inline-flex; align-items:center; gap:5px; font-weight:700; color:${R.muted};"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${R.brand}; box-shadow:0 0 0 1px ${R.ink};"></span>${esc(BRAND.name)}</span>
    </div>`;

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color:${R.ink}; padding:24px; max-width:900px; margin:0 auto; background:${R.bg};">
      ${headerHtml}
      ${contentsHtml}
      ${summary ? `
      ${minutesRankingHtml}
      ${goalsHtml}
      ${balanceSectionHtml}
      ${conclusionsHtml}` : `
      ${sectionTitle(secIcon("clock"), "Minutos y rotaciones", "minutos")}
      ${minutesHtml}
      ${minutesRankingHtml}
      ${goalsHtml}
      ${timelineHtml}
      ${presenceSectionHtml}
      ${balanceSectionHtml}
      ${shotsHtml}
      ${turnoverRecoverySectionHtml}
      ${conclusionsHtml}
      ${sectionTitle(secIcon("user"), "Fichas de jugadores", "fichas")}
      ${fichasHtml}`}
      ${footerHtml}
    </div>`;
}

// Título de la pestaña/vista del informe: equipo vs rival y fecha.
export function matchReportTitle(match, teamName) {
  const esc = (v) => String(v === undefined || v === null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dateLabel = new Date(match.date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  return `${esc(teamName || "Equipo")} vs ${esc(match.rivalName || "Rival")} — ${esc(dateLabel)}`;
}

// Datos en crudo del partido para llevarlos a otras herramientas (un
// planificador, una hoja de cálculo propia) sin pasar por el PDF -- el PDF es
// una imagen rasterizada (sin texto real ni datos embebidos), así que un
// archivo aparte con los mismos números que ya calculamos aquí (goles,
// asistencias, tarjetas, minutos, convocatoria) es la única vía fiable para que
// otra app los lea. Los campos de `partido` son los mismos que en el formato
// de la app de origen (data/formats.js): hay herramientas que ya los leen, así
// que no se renombran ni se quitan; añadir campos nuevos sí es seguro.
export function buildMatchJsonPayload(match, teamName) {
  return {
    formato: MATCH_FORMAT,
    version: MATCH_VERSION,
    equipo: teamName || "",
    partido: {
      date: match.date,
      rivalName: match.rivalName || "",
      teamGoals: match.teamGoals ?? 0,
      rivalScore: match.rivalScore ?? 0,
      halfLength: match.halfLength,
      ...(match.overtimeLength ? { overtimeLength: match.overtimeLength } : {}),
      venue: match.venue || "",
      startTime: match.startTime || "",
      players: match.players || [],
      goalEvents: match.goalEvents || [],
      convocados: match.convocados || null,
      // Campos añadidos (los lectores antiguos los ignoran): todo lo que hace
      // falta para cortes de vídeo y análisis en otras herramientas.
      ...(match.competition ? { competition: match.competition } : {}),
      ...(match.endTime ? { endTime: match.endTime } : {}),
      halves: match.halves || [],
      disciplineEvents: match.disciplineEvents || [],
      zonedEvents: match.zonedEvents || [],
      rotations: match.rotations || [],
      timeouts: match.timeouts || [],
      teamFouls: match.teamFouls || {},
      rivalTeamFouls: match.rivalTeamFouls || {},
      reportGeneratedAt: match.reportGeneratedAt || new Date().toISOString(),
    },
  };
}

export function downloadMatchDataJson(match, teamName, fileName) {
  const payload = buildMatchJsonPayload(match, teamName);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
