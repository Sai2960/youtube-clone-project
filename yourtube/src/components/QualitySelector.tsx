import { useRef, useState, useEffect } from "react";
import { Settings, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

// Quality type definition
type QualityType =
  | "auto"
  | "1080p"
  | "720p"
  | "480p"
  | "360p"
  | "240p"
  | "144p";

const qualityLabels: Record<
  QualityType,
  { full: string; short: string; desc: string }
> = {
  auto: { full: "Auto", short: "Auto", desc: "Recommended" },
  "1080p": { full: "1080p", short: "1080p", desc: "Full HD" },
  "720p": { full: "720p", short: "720p", desc: "HD" },
  "480p": { full: "480p", short: "480p", desc: "SD" },
  "360p": { full: "360p", short: "360p", desc: "Low" },
  "240p": { full: "240p", short: "240p", desc: "Data Saver" },
  "144p": { full: "144p", short: "144p", desc: "Minimum" },
};
interface QualitySelectorProps {
  currentQuality: QualityType;
  onQualityChange: (quality: QualityType) => void;
  availableQualities?: QualityType[];
  isMobile: boolean;
}

const QualitySelector: React.FC<QualitySelectorProps> = ({
  currentQuality,
  onQualityChange,
  availableQualities = [
    "auto",
    "1080p",
    "720p",
    "480p",
    "360p",
    "240p",
    "144p",
  ],
  isMobile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    position?: string;
  }>({});

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update menu position when opening
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      if (isMobile) {
        // Mobile: Fixed position above button, aligned right
        setMenuPosition({
          position: "fixed",
          bottom: `${viewportHeight - rect.top + 12}px`,
          right: "12px",
          top: "auto",
          left: "auto",
        });
      } else {
        // Desktop: Absolute position above button
        setMenuPosition({
          position: "fixed",
          bottom: `${viewportHeight - rect.top + 8}px`,
          right: `${viewportWidth - rect.right}px`,
          top: "auto",
          left: "auto",
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, isMobile]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedMenu = menuRef.current?.contains(target);
      const clickedButton = buttonRef.current?.contains(target);

      if (!clickedMenu && !clickedButton) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const openMenu = () => {
    console.log("📖 Opening quality menu");
    setIsOpen(true);
    setShowQualityMenu(false);
  };

  const closeMenu = () => {
    console.log("📕 Closing quality menu");
    setIsOpen(false);
    setShowQualityMenu(false);
  };

  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isChanging) {
      console.log("⚠️ Cannot toggle - quality is changing");
      return;
    }

    console.log("🔄 Toggle menu - currently open:", isOpen);

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleQualitySelect = async (quality: QualityType) => {
    if (quality === currentQuality || isChanging) return;

    console.log("✅ Selecting quality:", quality);
    setIsChanging(true);
    try {
      await onQualityChange(quality);
    } catch (error) {
      console.error("Quality change failed:", error);
    } finally {
      setIsChanging(false);
      closeMenu();
    }
  };

  // Render menu content
// Render menu content
  const renderMenu = () => {
    if (!isOpen) return null;

    const menuContent = (
      <div
        ref={menuRef}
        className="rounded-xl shadow-2xl"
        style={{
          ...menuPosition,
          background: isMobile
            ? "rgba(20, 20, 20, 0.98)"
            : "rgba(28, 28, 28, 0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          width: isMobile ? "240px" : "200px",
          maxHeight: "min(55vh, 320px)",
          zIndex: 9999999,
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.9)",
          overflow: "hidden",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          position: menuPosition.position as React.CSSProperties["position"],
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {!showQualityMenu ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log("📱 Quality menu button clicked");
              setShowQualityMenu(true);
            }}
            className="w-full px-5 py-3 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between rounded-xl touch-manipulation"
            style={{
              minHeight: "56px",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium whitespace-nowrap">
                Quality
              </span>
              <span
                className="text-xs"
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                {qualityLabels[currentQuality]?.short || currentQuality}
              </span>
            </div>
            <ChevronRight
              className="w-5 h-5"
              style={{ color: "rgba(255, 255, 255, 0.7)" }}
            />
          </button>
        ) : (
          <>
            <div
              className="px-4 py-2 sticky top-0 rounded-t-xl"
              style={{
                background: isMobile
                  ? "rgba(20, 20, 20, 1)"
                  : "rgba(28, 28, 28, 1)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                zIndex: 10,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu(false);
                }}
                className="w-full text-left flex items-center gap-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation rounded"
                style={{
                  minHeight: "28px",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <ChevronLeft
                  className="w-5 h-5"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                />
                <span className="text-sm font-semibold whitespace-nowrap">
                  Quality
                </span>
              </button>
            </div>

            <div
              className="overflow-y-auto overflow-x-hidden"
              style={{
                flex: 1,
                maxHeight: "min(45vh, 260px)",
                minHeight: "140px",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                paddingBottom: "8px",
                paddingTop: "4px",
              }}
            >
              {availableQualities.map((q) => {
                const isActive = q === currentQuality;
                const label = qualityLabels[q];

                return (
                  <button
                    key={q}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isChanging) {
                        handleQualitySelect(q);
                      }
                    }}
                    disabled={isChanging}
                    className="w-full px-5 py-2.5 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between touch-manipulation"
                    style={{
                      background: isActive
                        ? "rgba(255, 255, 255, 0.1)"
                        : "transparent",
                      opacity: isChanging ? 0.5 : 1,
                      cursor: isChanging ? "not-allowed" : "pointer",
                      minHeight: "36px",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    role="menuitemradio"
                    aria-checked={isActive}
                  >
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-sm font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">
                          {label.full}
                        </span>
                      </div>
                      {q === "auto" && (
                        <span
                          className="text-xs"
                          style={{ color: "rgba(255, 255, 255, 0.6)" }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    {isActive && !isChanging && (
                      <Check
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "#ef4444", strokeWidth: 2.5 }}
                      />
                    )}
                    {isChanging && isActive && (
                      <div
                        className="w-5 h-5 rounded-full animate-spin flex-shrink-0"
                        style={{
                          border: "2px solid #ef4444",
                          borderTopColor: "transparent",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );

    // Always use portal to avoid z-index issues
    if (typeof document !== "undefined") {
      return createPortal(menuContent, document.body);
    }
    return menuContent;
  };

  return (
    <>
      <div
        className="relative"
        data-quality-selector="true"
        style={{
          zIndex: 100000,
          isolation: "isolate",
          position: "relative",
          pointerEvents: "auto",
        }}
      >
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            console.log("🎯 Settings button clicked! isOpen:", isOpen);
            if (!isChanging) {
              toggleMenu(e);
            }
          }}
          className="flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 rounded-full transition-all duration-150 touch-manipulation relative"
          style={{
            WebkitTapHighlightColor: "transparent",
            minHeight: isMobile ? "48px" : "40px",
            minWidth: isMobile ? "48px" : "40px",
            height: isMobile ? "48px" : "40px",
            width: isMobile ? "48px" : "40px",
            zIndex: 100001,
            pointerEvents: "auto",
            position: "relative",
            touchAction: "manipulation",
          }}
          aria-label="Quality settings"
          aria-expanded={isOpen}
        >
          <Settings className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
        </button>
      </div>
      {renderMenu()}
    </>
  );
};

export default QualitySelector;
export type { QualityType, QualitySelectorProps };
