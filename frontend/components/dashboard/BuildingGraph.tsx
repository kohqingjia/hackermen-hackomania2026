import { motion } from "motion/react";

interface EnergyBuildingProps {
  userUsage: number;
  blockAverage: number;
  threshold: number;
  blockName?: string;
  timeLabel?: string;
}

const FLOORS = 10;
const WINDOWS_PER_SIDE = 6;

// SP Colour Palette
const SP = {
  teal: "#2DB7A3",
  mint: "#9DE1D3",
  chartMint: "#BFECE4",
  background: "#F5F7F7",
  cardWhite: "#FFFFFF",
  orange: "#F59E0B",
  primaryText: "#2F3A3A",
  secondaryText: "#6B7C7C",
};

// Building colour palette - light concrete tones visible at night
const BUILDING = {
  wall: "#E8EDED",          // white-grey concrete (like real HDB)
  wallAlt: "#E0E6E6",       // alternating panel — slightly darker grey
  windowDark: "#2F4444",    // unlit window - very dark glass
  windowFrame: "#A0B0B0",   // window border / frame — neutral grey
  slab: "#C8D0D0",          // floor slab — concrete grey
  slabEdge: "#B0BABA",      // slab edge — medium grey
  corridor: SP.teal,        // corridor / lift shaft — teal accent
  pillar: "#D0D8D8",        // structural pillars — light grey
  railing: "#F0F3F3",       // walkway railing — near-white
  roofTop: SP.teal,         // roof area — teal accent (like water tanks in image)
  ground: "#D5DCDC",        // ground floor — light concrete
  foundation: "#BCC5C5",    // base
};

const TEAL = {
  primary: SP.teal,
  light: SP.mint,
  glow: SP.teal + "35",
  border: `rgba(45, 183, 163, 0.25)`,
  bg: `rgba(45, 183, 163, 0.10)`,
};

const AMBER = {
  primary: SP.orange,
  light: "#FDE68A",
  glow: SP.orange + "35",
  border: `rgba(245, 158, 11, 0.25)`,
  bg: `rgba(245, 158, 11, 0.10)`,
};

export function EnergyBuilding({
  userUsage,
  blockAverage,
  threshold,
  blockName = "BLK 404",
  timeLabel = "Half-hourly usage",
}: EnergyBuildingProps) {
  const userRatio = Math.min(userUsage / threshold, 1);
  const blockRatio = Math.min(blockAverage / threshold, 1);
  const userLitFloors = Math.round(userRatio * FLOORS);
  const blockLitFloors = Math.round(blockRatio * FLOORS);

  const percentDiff = (
    ((blockAverage - userUsage) / blockAverage) * 100
  ).toFixed(0);
  const isBelow = userUsage < blockAverage;

  const renderWindows = (
    floorIndex: number,
    litFloors: number,
    side: "left" | "right"
  ) => {
    const floorFromBottom = FLOORS - 1 - floorIndex;
    const isLit = floorFromBottom < litFloors;
    const delay = isLit ? floorFromBottom * 0.04 : 0;
    const color = side === "left" ? TEAL : AMBER;

    return (
      <div className="flex gap-[2px]">
        {Array.from({ length: WINDOWS_PER_SIDE }).map((_, winIdx) => (
          <motion.div
            key={winIdx}
            className="rounded-[1.5px]"
            style={{
              width: 16,
              height: 20,
              border: `1px solid ${isLit ? color.primary + "66" : BUILDING.windowFrame}`,
              position: "relative",
              overflow: "hidden",
            }}
            initial={{
              backgroundColor: BUILDING.windowDark,
              boxShadow: "none",
            }}
            animate={{
              backgroundColor: isLit ? color.primary : BUILDING.windowDark,
              boxShadow: isLit
                ? `0 0 12px ${color.glow}, 0 0 4px ${color.primary}60`
                : `inset 0 1px 3px rgba(0,0,0,0.2)`,
            }}
            transition={{ duration: 0.4, delay: delay + winIdx * 0.025 }}
          >
            {/* Window mullion cross for unlit windows */}
            {!isLit && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: 1,
                    height: "100%",
                    backgroundColor: BUILDING.windowFrame,
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    width: "100%",
                    height: 1,
                    backgroundColor: BUILDING.windowFrame,
                    opacity: 0.5,
                  }}
                />
              </>
            )}
            {/* Light glow gradient for lit windows */}
            {isLit && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, ${color.primary}50 0%, ${color.primary}15 100%)`,
                }}
              />
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      {/* Building Container */}
      <div className="relative w-full">
        {/* Rooftop structures */}
        <div className="flex justify-center gap-6 mb-0 relative">
          {/* Water tank left */}
          {/* Antenna center */}
          <div className="flex flex-col items-center">
            <div
              style={{
                width: 2,
                height: 22,
                backgroundColor: BUILDING.pillar,
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                backgroundColor: SP.teal,
                boxShadow: `0 0 8px ${SP.teal}90`,
              }}
            />
          </div>
        </div>

        {/* Main building body */}
        <div
          className="relative rounded-t-md overflow-hidden"
          style={{
            backgroundColor: BUILDING.wall,
            border: `1px solid ${BUILDING.slabEdge}`,
          }}
        >
          {/* Roof cornice — teal accent stripe */}
          <div
            style={{
              height: 5,
              background: `linear-gradient(to right, ${SP.teal}, ${SP.mint}, ${SP.teal})`,
            }}
          />

          {/* Side labels */}
          <div
            className="flex justify-between items-center px-3 pt-2 pb-1.5"
            style={{ backgroundColor: SP.teal }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: SP.cardWhite,
                  boxShadow: `0 0 5px ${SP.cardWhite}70`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: SP.cardWhite,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  textShadow: `0 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                Your unit
              </span>
            </div>
            <span
              style={{
                fontSize: 8,
                color: SP.cardWhite + "AA",
                letterSpacing: "0.05em",
              }}
            >
              LIFT
            </span>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  fontSize: 11,
                  color: SP.cardWhite,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  textShadow: `0 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                Block avg
              </span>
              <div
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: SP.orange,
                  boxShadow: `0 0 5px ${SP.orange}70`,
                }}
              />
            </div>
          </div>

          {/* Floors */}
          <div className="px-2 pb-1">
            {Array.from({ length: FLOORS }).map((_, floorIdx) => {
              const floorNum = FLOORS - floorIdx;
              return (
                <div key={floorIdx}>
                  {/* Floor row */}
                  <div
                    className="flex items-center justify-between py-[2px]"
                    style={{
                      backgroundColor:
                        floorIdx % 3 === 0 ? SP.chartMint : floorIdx % 3 === 1 ? BUILDING.wall : BUILDING.wallAlt,
                      position: "relative",
                    }}
                  >
                    {/* Floor number + left pillar */}
                    <div className="flex items-center gap-1">
                      <span
                        style={{
                          fontSize: 7,
                          color: SP.secondaryText,
                          width: 14,
                          textAlign: "right",
                          fontFamily: "monospace",
                        }}
                      >
                        {floorNum}
                      </span>
                      {/* Left corridor rail */}
                      <div
                        style={{
                          width: 2,
                          height: 20,
                          backgroundColor: BUILDING.slab,
                          borderRadius: 1,
                        }}
                      />
                      {renderWindows(floorIdx, userLitFloors, "left")}
                      {/* Left corridor wall panel (between windows & lift) */}
                      <div
                        style={{
                          width: 5,
                          height: 20,
                          backgroundColor: floorIdx % 3 === 0 ? SP.teal : SP.mint,
                          borderRadius: 1,
                        }}
                      />
                    </div>

                    {/* Center - lift shaft + corridor */}
                    <div className="flex items-center gap-[3px] mx-1">
                      {/* Lift door */}
                      <div
                        className="rounded-[1px] overflow-hidden flex"
                        style={{
                          width: 16,
                          height: 20,
                          backgroundColor: "#8A9E9E",
                          borderTop: `1px solid ${BUILDING.slabEdge}`,
                          borderBottom: `1px solid ${BUILDING.slabEdge}`,
                          borderLeft: `1px solid ${BUILDING.slabEdge}`,
                          borderRight: `1px solid ${BUILDING.slabEdge}`,
                        }}
                      >
                        <div
                          style={{
                            width: "50%",
                            height: "100%",
                            borderRight: `1px solid ${BUILDING.slabEdge}`,
                            backgroundColor: "#8A9E9E",
                          }}
                        />
                        <div
                          style={{
                            width: "50%",
                            height: "100%",
                            backgroundColor: "#8A9E9E",
                          }}
                        />
                      </div>
                    </div>

                    {/* Right side windows + floor number */}
                    <div className="flex items-center gap-1">
                      {/* Right corridor wall panel (between lift & windows) */}
                      <div
                        style={{
                          width: 5,
                          height: 20,
                          backgroundColor: floorIdx % 3 === 0 ? SP.teal : SP.mint,
                          borderRadius: 1,
                        }}
                      />
                      {renderWindows(floorIdx, blockLitFloors, "right")}
                      {/* Right corridor rail */}
                      <div
                        style={{
                          width: 2,
                          height: 20,
                          backgroundColor: BUILDING.slab,
                          borderRadius: 1,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 7,
                          color: SP.secondaryText,
                          width: 14,
                          textAlign: "left",
                          fontFamily: "monospace",
                        }}
                      >
                        {floorNum}
                      </span>
                    </div>
                  </div>

                  {/* HDB Corridor walkway parapet — opaque strip below windows */}
                  <div
                    style={{
                      height: 5,
                      marginLeft: 16,
                      marginRight: 16,
                      backgroundColor: BUILDING.railing,
                      position: "relative",
                    }}
                  >
                    {/* Top railing bar */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: SP.cardWhite,
                        borderRadius: 1,
                      }}
                    />
                    {/* Bottom railing bar */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 1,
                        backgroundColor: BUILDING.slabEdge,
                        borderRadius: 1,
                      }}
                    />
                  </div>

                  {/* Floor slab between floors */}
                  {floorIdx < FLOORS - 1 && (
                    <div
                      style={{
                        height: 2,
                        backgroundColor: BUILDING.slab,
                        borderTop: `1px solid ${BUILDING.slabEdge}`,
                        borderBottom: `1px solid ${BUILDING.slabEdge}`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Ground floor - void deck with pillars */}
          <div
            className="px-2 py-2"
            style={{
              backgroundColor: BUILDING.ground,
              borderTop: `2px solid ${BUILDING.slabEdge}`,
            }}
          >
            <div className="flex items-end justify-center gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 18,
                    backgroundColor: BUILDING.pillar,
                    borderRadius: 1,
                    borderTop: `1px solid ${BUILDING.wall}`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Block number plate */}
          <div
            className="flex items-center justify-center py-2.5"
            style={{
              backgroundColor: BUILDING.ground,
              borderTop: `1px solid ${BUILDING.slab}`,
            }}
          >
            <div
              className="rounded-md px-5 py-1"
              style={{
                border: `1px solid ${SP.teal}`,
                backgroundColor: SP.teal,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: SP.cardWhite,
                  letterSpacing: "0.15em",
                }}
              >
                {blockName}
              </span>
            </div>
          </div>
        </div>

        {/* Building base / foundation */}
        <div
          className="rounded-b-md"
          style={{
            height: 8,
            background: `linear-gradient(to bottom, ${BUILDING.foundation}, ${BUILDING.ground})`,
            borderLeft: `1px solid ${BUILDING.slabEdge}`,
            borderRight: `1px solid ${BUILDING.slabEdge}`,
            borderBottom: `1px solid ${BUILDING.slabEdge}`,
          }}
        />

        {/* Ground pavement */}
        <div className="flex justify-center gap-[3px] mt-1.5">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i % 5 === 0 ? 4 : 3,
                height: 2,
                backgroundColor:
                  i % 4 === 0 ? `${SP.mint}30` : `${BUILDING.pillar}30`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}