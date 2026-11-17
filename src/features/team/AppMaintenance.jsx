/* Instalación, versión y actualizaciones de la app. Antes vivía al pie de
 * Inicio; ahora está en Equipo → Aplicación. Mismo comportamiento:
 *   · la versión instalada en ESTE dispositivo, a la vista;
 *   · «Buscar actualizaciones» fuerza la comprobación;
 *   · «Forzar actualización» vuelve a descargar la app sin borrar datos, y no
 *     se permite con un partido en curso ni sin conexión. */
import { useState } from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { T } from "../../theme/theme.js";
import { Button, Card, Eyebrow } from "../../ui/kit.jsx";

export function AppMaintenance({ canInstall, onInstall, standalone, updateReady, onApplyUpdate, onCheckUpdate, matchInProgress, onForceUpdate }) {
  const [confirmForce, setConfirmForce] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Eyebrow>Aplicación</Eyebrow>

      {/* Instalarla en la pantalla de inicio es lo que garantiza que en el
          pabellón, sin wifi, la app abra igual y con todos los datos. */}
      {!standalone && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={16} color={T.accent} aria-hidden="true" />
            <span className="display" style={{ fontSize: 17, fontWeight: 600 }}>Instálala en tu dispositivo</span>
          </div>
          <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5 }}>
            {canInstall
              ? "Se abre a pantalla completa y funciona sin conexión, con los datos guardados en el propio dispositivo."
              : isIOS
                ? "En iPad/iPhone: botón Compartir → «Añadir a pantalla de inicio». Después funciona sin conexión y sin la barra de Safari."
                : "Desde el menú del navegador, elige «Instalar aplicación». Después funciona sin conexión."}
          </div>
          {canInstall && <div><Button variant="primary" icon={Download} onClick={onInstall}>Instalar app</Button></div>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.dim }}>
        <WifiOff size={13} aria-hidden="true" />
        Funciona sin conexión · los datos se guardan solo en este dispositivo
      </div>

      {/* La versión que corre en ESTE dispositivo: es lo único que permite saber
          si una actualización ha llegado de verdad. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: T.dim, flexWrap: "wrap" }}>
        <span>Versión <strong style={{ color: T.text }}>{__APP_VERSION__}</strong> · {__APP_BUILD_DATE__}</span>
        {updateReady
          ? <Button size="sm" variant="primary" icon={RefreshCw} onClick={onApplyUpdate}>Actualizar ahora</Button>
          : <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onCheckUpdate}>Buscar actualizaciones</Button>}
      </div>

      {/* Si la versión nueva no llega por el camino normal, esto descarga la app
          de cero. No borra los datos (equipos, partidos, plantilla). */}
      <div style={{ fontSize: 12, color: T.dim }}>
        {!confirmForce ? (
          <button type="button" onClick={() => setConfirmForce(true)} style={{ background: "none", border: "none", padding: 0, color: T.dim, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>¿No se actualiza? Forzar actualización</button>
        ) : matchInProgress ? (
          <span>Hay un partido en curso: termínalo (o ponlo en pausa y guárdalo) antes de forzar la actualización. <Button size="sm" variant="ghost" onClick={() => setConfirmForce(false)} style={{ marginLeft: 6 }}>Vale</Button></span>
        ) : (
          <span>
            Se vuelve a descargar la app (hace falta conexión). <strong style={{ color: T.text }}>Tus datos no se borran.</strong>{" "}
            <Button size="sm" variant="ghost" onClick={() => { if (navigator.onLine === false) { setConfirmForce(false); return; } onForceUpdate(); }} style={{ marginLeft: 6 }}>{navigator.onLine === false ? "Sin conexión" : "Forzar ahora"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmForce(false)} style={{ marginLeft: 6 }}>Cancelar</Button>
          </span>
        )}
      </div>
    </Card>
  );
}
