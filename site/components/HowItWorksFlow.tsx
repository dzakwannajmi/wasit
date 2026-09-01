"use client"

import type { CSSProperties } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "./HowItWorksFlow.css"

type HandleSpec = {
  id: string
  kind: "source" | "target"
  position: Position
  style?: CSSProperties
}

type ActorData = {
  label: string
  sublabel: string
  variant: "actor" | "chain"
  handles: HandleSpec[]
}

// One lane per edge (four lanes, not two) — each of the four HTTP
// round-trip steps gets its own dedicated horizontal row between wasit
// and service, instead of the request and its response sharing a lane
// and drawing directly on top of each other. That overlap was the bug:
// two edges tracing the exact same line meant their numbered labels
// landed on the same point and rendered stacked/unreadable.
function lane(prefix: string, kind: "source" | "target", position: Position, top: string): HandleSpec {
  return { id: `${prefix}-${kind}`, kind, position, style: { top } }
}

const LANE_TOP = ["18%", "39%", "61%", "82%"] as const

const nodes: Node<ActorData>[] = [
  {
    id: "wasit",
    type: "actor",
    position: { x: 0, y: 20 },
    data: {
      label: "WASIT",
      sublabel: "the checker",
      variant: "actor",
      handles: [
        lane("lane-1", "source", Position.Right, LANE_TOP[0]),
        lane("lane-2", "target", Position.Right, LANE_TOP[1]),
        lane("lane-3", "source", Position.Right, LANE_TOP[2]),
        lane("lane-4", "target", Position.Right, LANE_TOP[3]),
        { id: "down-source", kind: "source", position: Position.Bottom },
      ],
    },
  },
  {
    id: "service",
    type: "actor",
    position: { x: 460, y: 20 },
    data: {
      label: "YOUR SERVICE",
      sublabel: "the target",
      variant: "actor",
      handles: [
        lane("lane-1", "target", Position.Left, LANE_TOP[0]),
        lane("lane-2", "source", Position.Left, LANE_TOP[1]),
        lane("lane-3", "target", Position.Left, LANE_TOP[2]),
        lane("lane-4", "source", Position.Left, LANE_TOP[3]),
      ],
    },
  },
  {
    id: "stellar",
    type: "actor",
    position: { x: 150, y: 300 },
    data: {
      label: "STELLAR",
      sublabel: "the source of truth",
      variant: "chain",
      handles: [{ id: "top-target", kind: "target", position: Position.Top }],
    },
  },
]

// Shared label styling so all four request/response edges render their
// numbered tag as a legible pill against the canvas, instead of bare
// text sitting on the line it labels.
const labelProps = {
  labelBgPadding: [6, 3] as [number, number],
  labelBgBorderRadius: 5,
  labelStyle: { fontWeight: 600 },
}

const edges: Edge[] = [
  {
    id: "e1",
    source: "wasit",
    sourceHandle: "lane-1-source",
    target: "service",
    targetHandle: "lane-1-target",
    label: "① unpaid request",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    ...labelProps,
  },
  {
    id: "e2",
    source: "service",
    sourceHandle: "lane-2-source",
    target: "wasit",
    targetHandle: "lane-2-target",
    label: "② 402 challenge",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    ...labelProps,
  },
  {
    id: "e3",
    source: "wasit",
    sourceHandle: "lane-3-source",
    target: "service",
    targetHandle: "lane-3-target",
    label: "③ signed payment",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    ...labelProps,
  },
  {
    id: "e4",
    source: "service",
    sourceHandle: "lane-4-source",
    target: "wasit",
    targetHandle: "lane-4-target",
    label: "④ 2xx receipt",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    ...labelProps,
  },
  {
    id: "e5",
    source: "wasit",
    sourceHandle: "down-source",
    target: "stellar",
    targetHandle: "top-target",
    label: "⑤ verify transfer event",
    animated: true,
    className: "flow-edge-accent",
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
    ...labelProps,
  },
]

function ActorNode({ data }: NodeProps<Node<ActorData>>) {
  return (
    <div className={`flow-actor${data.variant === "chain" ? " flow-actor--chain" : ""}`}>
      {data.handles.map((h) => (
        <Handle key={h.id} id={h.id} type={h.kind} position={h.position} style={h.style} />
      ))}
      <span className="flow-actor-label mono">{data.label}</span>
      <span className="flow-actor-sub">{data.sublabel}</span>
    </div>
  )
}

const nodeTypes = { actor: ActorNode }

/**
 * The request/response cycle from the "How it works" section, as an
 * actual sequence diagram instead of a numbered list — Wasit and Your
 * Service trade the HTTP round trip (steps ①–④, each on its own lane
 * so the rows never overlap), then Wasit breaks out of that exchange
 * entirely to check Stellar directly (⑤, the accent edge). That last
 * edge going somewhere neither of the other two nodes touch is the
 * whole point of the section: a receipt only proves your service
 * CLAIMS to have been paid, the chain proves it actually happened.
 *
 * Nodes are draggable and the canvas pans/pinch-zooms (zoomOnScroll is
 * off on purpose — a marketing page shouldn't hijack the mouse wheel
 * from normal page scrolling), but new connections can't be drawn; this
 * is a diagram to explore, not an editor.
 */
export function HowItWorksFlow() {
  return (
    <div className="flow-canvas" role="img" aria-label="Sequence diagram: Wasit and your service exchange an HTTP payment challenge and payment, then Wasit independently verifies the transfer on Stellar rather than trusting your service's receipt.">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: false }}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        minZoom={0.6}
        maxZoom={1.4}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a2a" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
