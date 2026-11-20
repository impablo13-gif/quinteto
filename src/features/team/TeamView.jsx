/* Equipo: plantilla, datos del club, datos guardados y la propia app.
 * Reúne lo que antes estaba repartido entre la pestaña Plantilla y los
 * accesos y el pie de Inicio. */
import { DatabaseBackup, FileSpreadsheet, Settings } from "lucide-react";
import { T } from "../../theme/theme.js";
import { Button, Card, Eyebrow, SectionHeader } from "../../ui/kit.jsx";
import { CrestAvatar } from "../../ui/common.jsx";
import { RosterEditor } from "../roster/RosterEditor.jsx";
import { AppMaintenance } from "./AppMaintenance.jsx";
import { ClubColors } from "./ClubColors.jsx";
import { TeamRules } from "./TeamRules.jsx";
import { RosterImport } from "../roster/RosterImport.jsx";

export function TeamView({
  team, teamCount, onOpenTeams, onPickCrest, onReframeCrest, onRemoveCrest, onChangeColors, onChangeConfig, matches,
  roster, onImportRoster, rosterLocked, hasHistory, onExport, onOpenBackup, lastBackupAt,
  maintenance,
}) {
  const backupText = !lastBackupAt ? "Todavía no hay ninguna copia de seguridad en este dispositivo."
    : `Última copia: ${new Date(lastBackupAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}.`;
  return (
    <div className="fadein" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHeader title="Equipo" subtitle="Plantilla, club, copias de seguridad y la aplicación" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Eyebrow>Club</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <CrestAvatar crest={team.crest} size={52} onPick={onPickCrest} onReframe={onReframeCrest} onRemove={onRemoveCrest} shape="circle" />
            <div style={{ minWidth: 0 }}>
              <div className="display" style={{ fontSize: 20, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</div>
              {team.subtitle && <div style={{ fontSize: 12, color: T.dim }}>{team.subtitle}</div>}
            </div>
          </div>
          <div><Button size="sm" variant="ghost" icon={Settings} onClick={onOpenTeams}>{teamCount > 1 ? `Cambiar o editar equipos (${teamCount})` : "Editar o añadir equipos"}</Button></div>
          {onChangeColors && team.id && <ClubColors team={team} onChange={onChangeColors} />}
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Eyebrow>Datos</Eyebrow>
          <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5 }}>Los datos viven solo en este dispositivo. {backupText}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="primary" icon={DatabaseBackup} onClick={onOpenBackup}>Copia de seguridad</Button>
            <Button size="sm" variant="ghost" icon={FileSpreadsheet} onClick={onExport} disabled={!hasHistory} title={hasHistory ? "Descarga todas las estadísticas" : "Disponible cuando haya datos guardados"}>Exportar a Excel</Button>
          </div>
        </Card>
      </div>

      {onChangeConfig && team.id && <TeamRules team={team} matches={matches} onChange={onChangeConfig} />}

      <Card>
        {onImportRoster && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}><RosterImport roster={roster.players} onApply={onImportRoster} replaceLocked={rosterLocked} /></div>}
        <RosterEditor {...roster} />
      </Card>

      <AppMaintenance {...maintenance} />
    </div>
  );
}
