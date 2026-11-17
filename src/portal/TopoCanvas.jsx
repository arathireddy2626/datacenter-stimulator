import {
  ArrowLeftRight,
  BatteryCharging,
  Box,
  Cpu,
  Droplets,
  Fan,
  Flame,
  Fuel,
  HardDrive,
  LayoutGrid,
  Lock,
  Network,
  PlugZap,
  Server,
  Snowflake,
  ToggleRight,
  Zap,
} from 'lucide-react';
import { INFO } from './equipInfo';
import { KIND_LABELS } from './data';
import { MiniCube } from './Equip3D';

export const W = 900,
  H = 460,
  NW = 130,
  NH = 96;
export const labelOf = (key) => KIND_LABELS[key] || INFO[key]?.title || key;

const ICONS = {
  util: Zap,
  mv: ToggleRight,
  ats: ArrowLeftRight,
  gen: Fuel,
  msb: LayoutGrid,
  ups: BatteryCharging,
  pdu: PlugZap,
  rack: Server,
  crah: Fan,
  chiller: Snowflake,
  network: Network,
  storage: HardDrive,
  server: Cpu,
  fire: Flame,
  leak: Droplets,
  security: Lock,
};
export const iconOf = (kind) => ICONS[kind] || Box;

// The drawing surface shared by the admin's builder and the instructor/student viewer.
// Equipment is shown as small rotating 3D models; links are drawn underneath.
export default function TopoCanvas({
  topo,
  status = () => 'normal',
  at = (n) => n,
  picked,
  hostRef,
  onNodeClick,
  onNodeDown,
  onNodeRename,
  onMove,
  onUp,
  onDropKind,
  onCanvasClick,
  selectedLink,
  onLinkClick,
}) {
  const by = Object.fromEntries(topo.nodes.map((n) => [n.id, at(n)]));
  return (
    <div
      ref={hostRef}
      className="pt-tcanvas"
      onPointerMove={onMove}
      onPointerUp={onUp}
      onDragOver={(e) => onDropKind && e.preventDefault()}
      onDrop={onDropKind}
      onClick={onCanvasClick}
    >
      <svg className="pt-tlinks" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {topo.links.map((l, i) => {
          const a = by[l.from],
            b = by[l.to];
          if (!a || !b) return null;
          const bad = status(l.from) === 'critical' || status(l.to) === 'critical';
          return (
            <g key={i}>
              <line
                className={`pt-link ${bad ? 'critical' : ''} ${selectedLink === i ? 'sel' : ''}`}
                x1={a.x + NW / 2}
                y1={a.y + NH / 2}
                x2={b.x + NW / 2}
                y2={b.y + NH / 2}
              />
              {onLinkClick && (
                <line
                  className="pt-linkhit"
                  x1={a.x + NW / 2}
                  y1={a.y + NH / 2}
                  x2={b.x + NW / 2}
                  y2={b.y + NH / 2}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkClick(i);
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      {topo.nodes.map((n) => {
        const p = by[n.id];
        const Icon = iconOf(n.kind);
        return (
          <div
            key={n.id}
            className={`pt-tnode ${status(n.id)} ${picked === n.id ? 'picked' : ''}`}
            style={{
              left: `${(p.x / W) * 100}%`,
              top: `${(p.y / H) * 100}%`,
              width: `${(NW / W) * 100}%`,
              height: `${(NH / H) * 100}%`,
            }}
            onPointerDown={(e) => onNodeDown?.(e, n)}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(n);
            }}
            onDoubleClick={() => onNodeRename?.(n)}
            tabIndex={0}
          >
            <MiniCube kind={n.kind} status={status(n.id)} />
            <span className="pt-tname">
              <Icon size={12} />
              {n.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
