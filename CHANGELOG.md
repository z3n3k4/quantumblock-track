# Changelog — quantumblock.org

Control de cambios del sitio. Backups pre-cambio en `../web_backups/<fecha>/`
(fuera del repo — no se publican). Rollback: `git revert` o restaurar backup.

## 2026-06-11 — Rediseño completo "Seismograph DNA"

**Rollback point**: commit `79f3f0f` · backups en `web_backups/20260611/`

### index.html (reemplazo total — legacy respaldado)
- Nuevo landing inmersivo de scroll: hero + 3 mundos (Pulse / Compass / Foreshock)
  + track record + waitlist.
- **Hero vivo**: conectado al websocket público de Binance (BTCUSDT ticker) —
  el ritmo de las animaciones (heartbeat), el mar de ondas del fondo, los
  epicentros y el "market needle" reaccionan a la volatilidad real en vivo.
  Fallback a REST polling si el WS falla.
- Mundos con scroll storytelling (GSAP ScrollTrigger): radar Pulse con barrido
  y pings, anatomía de señal Compass (escena pinned/scrubbed), sismograma
  onda P/onda S Foreshock (escena pinned/scrubbed).
- Track record en home: consume `signals.json` REAL (cadena de hashes de las
  últimas 5 señales + tabla de últimas 5 cerradas + métricas con count-up).
  Fallback a datos demo si el fetch falla.
- Waitlist: embed Beehiiv existente (form 5a50cd54) como sección final; todos
  los CTAs de producto anclan aquí.
- Accesibilidad/perf: prefers-reduced-motion, pausa con pestaña oculta,
  fuentes Google (Inter + IBM Plex Mono), un solo archivo sin build step.

### track-record.html / verify.html (re-tematizadas, lógica intacta)
- `qb-theme.css`: overlay de tokens — base #0a0a0a/#262626, acento teal
  #3CE6AC unificado, Inter para labels + Plex Mono para valores, micro-vida
  (hovers, transiciones). NO se tocó track.js ni la lógica de verificación.
- `qb-sea-lite.js`: fondo de ondas suaves (versión ligera, sin websocket).
- Rollback de solo estas páginas: quitar los `<link/script>` de qb-theme/qb-sea.

### Notas
- `publish_track.py` no se ve afectado (solo toca signals.json/csv/verify.md).
- Sin información privada de los modelos en el copy público.
