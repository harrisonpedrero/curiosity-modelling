// WRITTEN BY CLAUDE
//
// ============================================================
// NFA Regex Matcher Visualizer for Forge 
// ============================================================
// Static layered layout (Sugiyama-style): BFS from Start assigns
// columns, nodes within each column are evenly spaced vertically.
// No force simulation — instant, deterministic, stable.
// ============================================================

{
  // ─── PALETTE ───────────────────────────────────────────────
  const C = {
    bg:         "#0f1117",
    panel:      "#181b24",
    border:     "#2a2e3a",
    text:       "#e2e4ea",
    muted:      "#6b7080",
    accent:     "#6c9cfc",
    start:      "#4ea8de",
    startBg:    "rgba(78,168,222,0.12)",
    accept:     "#56d67b",
    acceptBg:   "rgba(86,214,123,0.12)",
    nodeBg:     "#1a1d28",
    trace:      "#f0763a",
    traceGlow:  "rgba(240,118,58,0.35)",
    skip:       "#a78bfa",
    next:       "#5a6378",
    wild:       "#facc15",
    tapeCell:   "#1a1d28",
    tapeBorder: "#2a2e3a",
  };
  const FONT = "'JetBrains Mono','Fira Code','SF Mono',monospace";

  // ─── 1. DATA EXTRACTION ────────────────────────────────────

  // A. Input string
  const inputSig = instance.signature('Input');
  const inputAtom = inputSig?.atoms()[0];
  let inputString = [];
  if (inputAtom) {
    inputString = inputAtom.join(instance.field('string')).tuples().map(t => ({
      index: parseInt(t.atoms()[0].id()),
      char:  t.atoms()[1].id().replace(/[0-9]+$/, '')
    })).sort((a, b) => a.index - b.index);
  }

  // B. NFA nodes & edges
  const allNodeAtoms = new Map();
  ['Node','Start','Accepting'].forEach(s => {
    const sig = instance.signature(s);
    if (sig) sig.atoms().forEach(a => allNodeAtoms.set(a.id(), a));
  });

  const nodes = Array.from(allNodeAtoms.values()).map(atom => {
    const id = atom.id();
    const isWild = atom.join(instance.field('wildcard')).tuples()
                       .some(t => t.atoms()[0].id().includes("True"));
    const charT = atom.join(instance.field('character')).tuples()[0];
    let label = "?";
    if (id.includes("Start"))     label = "▶";
    else if (id.includes("Accepting")) label = "✓";
    else if (isWild)              label = ".";
    else if (charT)               label = charT.atoms()[0].id().replace(/[0-9]+$/,'');
    return { id, label, isStart: id.includes("Start"), isAccept: id.includes("Accepting"), isWild, atom };
  });

  const edges = [];
  nodes.forEach(src => {
    src.atom.join(instance.field('next')).tuples().forEach(t =>
      edges.push({ src: src.id, tgt: t.atoms()[0].id(), type: 'next' }));
    src.atom.join(instance.field('skip')).tuples().forEach(t =>
      edges.push({ src: src.id, tgt: t.atoms()[0].id(), type: 'skip' }));
  });

  // C. Trace
  const traceSig = instance.signature('Trace');
  const activeEdges = new Set();
  const activeNodes = new Set();
  const traceIndices = new Set();
  let traceCount = 0;

  if (traceSig?.atoms().length > 0) {
    const traceRel = traceSig.atoms()[0].join(instance.field('tr'));
    const states = instance.signature('State').atoms();
    const sNode = {}, sIdx = {};
    states.forEach(s => {
      const n = s.join(instance.field('currNode')).tuples()[0];
      const i = s.join(instance.field('index')).tuples()[0];
      if (n) sNode[s.id()] = n.atoms()[0].id();
      if (i) sIdx[s.id()] = parseInt(i.atoms()[0].id());
    });
    traceRel.tuples().forEach(t => {
      const s1 = t.atoms()[0], s2 = t.atoms()[1];
      let ok = true;
      if (t.atoms().length > 2) ok = t.atoms()[2].id().includes("True");
      if (s1 && s2 && ok) {
        const n1 = sNode[s1.id()], n2 = sNode[s2.id()];
        if (n1 && n2) {
          activeNodes.add(n1); activeNodes.add(n2);
          activeEdges.add(`${n1}->${n2}`);
          if (sIdx[s1.id()] !== undefined) traceIndices.add(sIdx[s1.id()]);
          traceCount++;
        }
      }
    });
  }

  // ─── 2. LAYOUT (static, BFS-layered) ──────────────────────

  // BFS from Start to assign depth (column)
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => adj[e.src].push(e.tgt));

  const depth = {};
  const startId = nodes.find(n => n.isStart)?.id;
  if (startId) {
    depth[startId] = 0;
    const q = [startId];
    let h = 0;
    while (h < q.length) {
      const cur = q[h++];
      (adj[cur] || []).forEach(nid => {
        if (depth[nid] === undefined) { depth[nid] = depth[cur] + 1; q.push(nid); }
      });
    }
  }
  const maxD = Math.max(1, ...Object.values(depth));
  nodes.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = Math.floor(maxD / 2); });

  // Ensure Accepting is always in the rightmost column
  const acceptId = nodes.find(n => n.isAccept)?.id;
  if (acceptId) depth[acceptId] = maxD;

  // Group into layers
  const layers = {};
  nodes.forEach(n => { const d = depth[n.id]; (layers[d] = layers[d] || []).push(n); });
  const numCols = maxD + 1;

  // ─── 3. RENDERING ─────────────────────────────────────────

  const svg = d3.select("svg");
  svg.selectAll("*").remove();

  const W = 820, R = 22;
  const tapeAreaH = 105;
  const legendH = 44;
  const vertSpacing = 90;
  const maxLayerSize = Object.values(layers).reduce((mx, l) => Math.max(mx, l.length), 0);
  const numNextEdges = edges.filter(e => e.type==='next' && e.src!==e.tgt).length;
  const numSkipEdges = edges.filter(e => e.type==='skip' && e.src!==e.tgt).length;
  const arcSpace = Math.max(numNextEdges, numSkipEdges) * 28 + 60; // space for edge arcs
  const graphH = Math.max(400, maxLayerSize * vertSpacing + arcSpace * 2 + 80);
  const H = tapeAreaH + graphH + legendH;
  const PAD = 65;

  svg.attr("viewBox", `0 0 ${W} ${H}`)
     .style("background", C.bg).style("font-family", FONT);

  // --- Defs ---
  const defs = svg.append("defs");
  const glow = defs.append("filter").attr("id","glow");
  glow.append("feGaussianBlur").attr("stdDeviation","3.5").attr("result","b");
  glow.append("feMerge").selectAll("feMergeNode").data(["b","SourceGraphic"]).enter().append("feMergeNode").attr("in",d=>d);

  [["arr-next",C.next],["arr-skip",C.skip],["arr-trace",C.trace]].forEach(([id,col]) => {
    defs.append("marker").attr("id",id).attr("viewBox","0 -5 10 10")
      .attr("refX",10).attr("refY",0).attr("markerWidth",7).attr("markerHeight",7).attr("orient","auto")
      .append("path").attr("d","M0,-4L10,0L0,4Z").attr("fill",col);
  });

  // ─── HEADER ────────────────────────────────────────────────
  const hdr = svg.append("g");
  hdr.append("rect").attr("width",W).attr("height",36).attr("fill",C.panel);
  hdr.append("text").attr("x",16).attr("y",23).text("NFA REGEX MATCHER")
     .attr("fill",C.accent).style("font-size","11px").style("letter-spacing","2px").style("font-weight","700");
  hdr.append("text").attr("x",W-16).attr("y",23).attr("text-anchor","end")
     .text(`${nodes.length} nodes · ${edges.length} edges · ${inputString.length} chars · ${traceCount} transitions`)
     .attr("fill",C.muted).style("font-size","10px");

  // ─── INPUT TAPE ────────────────────────────────────────────
  const cW = 36, cH = 36;
  const tX = (W - inputString.length * cW) / 2;
  const tape = svg.append("g").attr("transform",`translate(${tX},50)`);
  tape.append("text").attr("x",-8).attr("y",cH/2+4).attr("text-anchor","end")
      .text("INPUT").attr("fill",C.muted).style("font-size","9px").style("letter-spacing","1.5px");

  inputString.forEach((d,i) => {
    const on = traceIndices.has(d.index);
    const g = tape.append("g").attr("transform",`translate(${i*cW},0)`);
    g.append("rect").attr("width",cW-2).attr("height",cH).attr("rx",4)
     .attr("fill", on ? "rgba(240,118,58,0.1)" : C.tapeCell)
     .attr("stroke", on ? C.trace : C.tapeBorder).attr("stroke-width", on ? 1.5 : 0.5);
    g.append("text").attr("x",(cW-2)/2).attr("y",cH/2+5).attr("text-anchor","middle")
     .text(d.char).attr("fill", on ? C.trace : C.text).style("font-size","15px").style("font-weight","600");
    g.append("text").attr("x",(cW-2)/2).attr("y",cH+13).attr("text-anchor","middle")
     .text(d.index).attr("fill",C.muted).style("font-size","8px");
  });

  // ─── GRAPH ─────────────────────────────────────────────────
  const gTop = tapeAreaH;
  const gG = svg.append("g").attr("transform",`translate(0,${gTop})`);

  // Subtle grid
  const grid = gG.append("g").attr("opacity",0.04);
  for(let x=0;x<W;x+=40) grid.append("line").attr("x1",x).attr("y1",0).attr("x2",x).attr("y2",graphH).attr("stroke",C.text);
  for(let y=0;y<graphH;y+=40) grid.append("line").attr("x1",0).attr("y1",y).attr("x2",W).attr("y2",y).attr("stroke",C.text);

  // Assign pixel positions — columns left to right, nodes centered vertically per column
  const nodePos = {};
  Object.entries(layers).forEach(([col, lnodes]) => {
    const c = parseInt(col);
    const x = PAD + (c / Math.max(1, numCols - 1)) * (W - 2 * PAD);
    lnodes.forEach((n, i) => {
      const y = (graphH / 2) + (i - (lnodes.length - 1) / 2) * vertSpacing;
      nodePos[n.id] = { x, y };
    });
  });

  // ─── EDGE DRAWING ──────────────────────────────────────────
  // Strategy: 
  //   - "next" edges arc ABOVE the node row
  //   - "skip" edges arc BELOW the node row
  //   - Each edge gets a unique height slot so no two overlap
  //   - Self-loops arc above the node
  //   - Uses cubic Béziers for smooth curves that leave/arrive cleanly

  // Compute the Y baseline (center of the node row)
  const allY = Object.values(nodePos).map(p => p.y);
  const nodeRowY = allY.reduce((a,b)=>a+b,0) / allY.length;

  // Separate edges by direction
  const nextEdges = edges.filter(e => e.type === 'next' && e.src !== e.tgt);
  const skipEdges = edges.filter(e => e.type === 'skip' && e.src !== e.tgt);
  const selfEdges = edges.filter(e => e.src === e.tgt);

  // Sort each group by span (short edges get tighter arcs, closer to nodes)
  function edgeSpan(e) { return Math.abs((depth[e.src]||0)-(depth[e.tgt]||0)); }
  nextEdges.sort((a,b) => edgeSpan(a) - edgeSpan(b));
  skipEdges.sort((a,b) => edgeSpan(a) - edgeSpan(b));

  // Assign unique slot index within each group
  nextEdges.forEach((e,i) => { e._slot = i; e._groupSize = nextEdges.length; });
  skipEdges.forEach((e,i) => { e._slot = i; e._groupSize = skipEdges.length; });

  const slotH = 28; // vertical spacing per slot
  const minArc = 35; // minimum arc height

  function makePath(e) {
    const s = nodePos[e.src], t = nodePos[e.tgt];
    if (!s || !t) return "";

    // Self-loop
    if (e.src === e.tgt) {
      return `M${s.x-10},${s.y-R} C${s.x-45},${s.y-75} ${s.x+45},${s.y-75} ${s.x+10},${s.y-R}`;
    }

    const isSkip = e.type === 'skip';
    const sign = isSkip ? 1 : -1; // +1 = below, -1 = above

    // Arc height: tighter for short edges, higher for long ones
    // Each edge in its group gets a unique slot
    const arcH = (minArc + e._slot * slotH) * sign;

    // Control point Y: above or below the node row
    const cpY = nodeRowY + arcH;

    // Start and end points on the node circle edge
    // Leave from top/bottom of source, arrive at top/bottom of target
    const exitY  = s.y + (sign * R);
    const enterY = t.y + (sign * R);

    // Cubic Bézier: exit vertically, sweep to control height, arrive vertically
    const cp1x = s.x, cp1y = cpY;
    const cp2x = t.x, cp2y = cpY;

    return `M${s.x},${exitY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${t.x},${enterY}`;
  }

  function edgeMid(e) {
    const s = nodePos[e.src], t = nodePos[e.tgt];
    if (!s||!t) return {x:0,y:0};
    if (e.src===e.tgt) return {x:s.x, y:s.y-75};
    const isSkip = e.type === 'skip';
    const sign = isSkip ? 1 : -1;
    const arcH = (minArc + e._slot * slotH) * sign;
    return { x:(s.x+t.x)/2, y: nodeRowY + arcH };
  }

  // Draw layers: non-trace bg edges, then trace edges on top, then nodes on top of all
  const edgeG = gG.append("g");
  const traceEdgeG = gG.append("g");

  const allRoutedEdges = [...nextEdges, ...skipEdges, ...selfEdges];

  // Sort: draw non-active first, active on top
  allRoutedEdges.sort((a,b) => {
    const aA = activeEdges.has(`${a.src}->${a.tgt}`) ? 1 : 0;
    const bA = activeEdges.has(`${b.src}->${b.tgt}`) ? 1 : 0;
    return aA - bA;
  });

  allRoutedEdges.forEach(e => {
    const isActive = activeEdges.has(`${e.src}->${e.tgt}`);
    const isSkip = e.type === 'skip';
    const col = isActive ? C.trace : isSkip ? C.skip : C.next;
    const marker = isActive ? "url(#arr-trace)" : isSkip ? "url(#arr-skip)" : "url(#arr-next)";
    const targetG = isActive ? traceEdgeG : edgeG;

    targetG.append("path")
      .attr("d", makePath(e))
      .attr("fill","none")
      .attr("stroke", col)
      .attr("stroke-width", isActive ? 3 : 1.3)
      .attr("stroke-dasharray", isSkip ? "6,4" : "0")
      .attr("marker-end", marker)
      .attr("opacity", isActive ? 1 : 0.4)
      .attr("filter", isActive ? "url(#glow)" : "none");

    // ε label for skip edges
    if (isSkip) {
      const mid = edgeMid(e);
      targetG.append("text")
        .attr("x", mid.x).attr("y", mid.y + (e.type === 'skip' ? 16 : -8))
        .attr("text-anchor","middle")
        .text("ε")
        .attr("fill", isActive ? C.trace : C.skip)
        .style("font-size","11px").style("font-weight","700");
    }
  });

  // ─── NODE DRAWING ──────────────────────────────────────────
  const nodeGrp = gG.append("g");
  nodes.forEach(n => {
    const p = nodePos[n.id];
    if (!p) return;
    const g = nodeGrp.append("g").attr("transform",`translate(${p.x},${p.y})`);
    const isOn = activeNodes.has(n.id);

    // Glow ring if in trace
    if (isOn) {
      g.append("circle").attr("r", R+9).attr("fill","none")
       .attr("stroke", C.traceGlow).attr("stroke-width",5).attr("filter","url(#glow)");
    }

    // Double ring for accept
    if (n.isAccept) {
      g.append("circle").attr("r", R+5).attr("fill","none")
       .attr("stroke", C.accept).attr("stroke-width",1.5).attr("stroke-dasharray","3,3");
    }

    // Main circle
    g.append("circle").attr("r", R)
     .attr("fill", n.isStart ? C.startBg : n.isAccept ? C.acceptBg : C.nodeBg)
     .attr("stroke", isOn ? C.trace : n.isStart ? C.start : n.isAccept ? C.accept : n.isWild ? C.wild : C.border)
     .attr("stroke-width", isOn ? 2.5 : 1.5);

    // Character label
    g.append("text").attr("dy",5).attr("text-anchor","middle")
     .text(n.label)
     .attr("fill", n.isStart ? C.start : n.isAccept ? C.accept : n.isWild ? C.wild : C.text)
     .style("font-size", (n.isStart||n.isAccept) ? "16px" : "14px")
     .style("font-weight","700").style("pointer-events","none");

    // Sublabel (node id)
    g.append("text").attr("dy", R+15).attr("text-anchor","middle")
     .text(n.isStart ? "Start" : n.isAccept ? "Accept" : n.id.replace(/^.*\//,''))
     .attr("fill", C.muted).style("font-size","9px").style("pointer-events","none");
  });

  // ─── LEGEND ────────────────────────────────────────────────
  const leg = svg.append("g").attr("transform",`translate(16,${H - legendH + 10})`);
  const items = [
    {l:"Start",    c:C.start, circ:true},
    {l:"Accept",   c:C.accept,circ:true},
    {l:"Wildcard", c:C.wild,  circ:true},
    {l:"next →",   c:C.next,  line:true},
    {l:"skip (ε)", c:C.skip,  line:true, dash:"4,3"},
    {l:"Trace",    c:C.trace, line:true},
  ];
  let lx = 0;
  items.forEach(it => {
    const g = leg.append("g").attr("transform",`translate(${lx},0)`);
    if (it.line) {
      g.append("line").attr("x1",0).attr("y1",6).attr("x2",20).attr("y2",6)
       .attr("stroke",it.c).attr("stroke-width",2).attr("stroke-dasharray",it.dash||"");
    } else if (it.circ) {
      g.append("circle").attr("cx",7).attr("cy",6).attr("r",6)
       .attr("fill","none").attr("stroke",it.c).attr("stroke-width",2);
    }
    g.append("text").attr("x",26).attr("y",10).text(it.l)
     .attr("fill",C.muted).style("font-size","9px").style("letter-spacing","0.5px");
    lx += it.l.length * 7 + 42;
  });
}