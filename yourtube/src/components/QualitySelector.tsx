import { useRef, useState, useEffect } from "react";
import { Settings, Check, ChevronLeft, ChevronRight } from "lucide-react";

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

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
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

  // Prevent body scroll on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      const scrollY = window.scrollY;
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, isOpen]);

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
    if (isChanging) return;

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

  // Calculate menu position for mobile
  const getMenuPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = showQualityMenu ? 380 : 60;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove > menuHeight + 8) {
      return { bottom: window.innerHeight - rect.top + 8, top: "auto" };
    } else if (spaceBelow > menuHeight + 8) {
      return { top: rect.bottom + 8, bottom: "auto" };
    } else {
      return { bottom: window.innerHeight - rect.top + 8, top: "auto" };
    }
  };

  return (
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
      {/* Settings Button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          console.log("🎯 Settings button clicked!");
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

      {/* MOBILE VIEW - Two-step menu like desktop */}
      {isMobile && isOpen && (
        <div
          ref={menuRef}
          className="rounded-xl shadow-2xl"
          style={{
            position: "fixed",
            right: 16,
            left: "auto",
            ...getMenuPosition(),
            background: "rgba(28, 28, 28, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            width: "200px",
            maxHeight: "400px",
            zIndex: 999999,
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.7)",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!showQualityMenu ? (
            /* Step 1: Settings menu with Quality option */
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("📱 Quality menu button clicked");
                setShowQualityMenu(true);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full px-4 py-4 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between rounded-xl touch-manipulation"
              style={{
                minHeight: "56px",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Quality</span>
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
            /* Step 2: Quality options with back button */
            <>
              {/* Back button header */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-2 sticky top-0 rounded-t-xl touch-manipulation"
                style={{
                  background: "rgba(28, 28, 28, 1)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  zIndex: 10,
                  minHeight: "48px",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <ChevronLeft
                  className="w-5 h-5"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                />
                <span className="text-sm font-semibold">Quality</span>
              </button>

              {/* Quality options list */}
              <div
                className="overflow-y-auto overflow-x-hidden"
                style={{
                  maxHeight: "320px",
                  overscrollBehavior: "contain",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
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
                        handleQualitySelect(q);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      disabled={isChanging}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between touch-manipulation"
                      style={{
                        background: isActive
                          ? "rgba(255, 255, 255, 0.08)"
                          : "transparent",
                        opacity: isChanging ? 0.5 : 1,
                        cursor: isChanging ? "not-allowed" : "pointer",
                        minHeight: "48px",
                        WebkitTapHighlightColor: "transparent",
                      }}
                      role="menuitemradio"
                      aria-checked={isActive}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-white">
                          {label.short}
                        </span>
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
                          style={{ color: "#ff0000", strokeWidth: 2.5 }}
                        />
                      )}
                      {isChanging && isActive && (
                        <div
                          className="w-5 h-5 rounded-full animate-spin flex-shrink-0"
                          style={{
                            border: "2px solid #ff0000",
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
      )}

      {/* DESKTOP VIEW - Dropdown Menu */}
      {!isMobile && isOpen && (
        <div
          ref={menuRef}
          className="absolute rounded-xl shadow-2xl"
          style={{
            position: "fixed",
            bottom: "auto",
            top: buttonRef.current
              ? `${buttonRef.current.getBoundingClientRect().top - 8}px`
              : "auto",
            right: buttonRef.current
              ? `${
                  window.innerWidth -
                  buttonRef.current.getBoundingClientRect().right
                }px`
              : "16px",
            transform: "translateY(-100%)",
            background: "rgba(28, 28, 28, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            width: "200px",
            maxWidth: "calc(100vw - 48px)",
            zIndex: 999999,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!showQualityMenu ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu(true);
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between rounded-xl"
              style={{ minHeight: "52px" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Quality</span>
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-2 sticky top-0 rounded-t-xl"
                style={{
                  background: "rgba(28, 28, 28, 1)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  zIndex: 10,
                  minHeight: "48px",
                }}
              >
                <ChevronLeft
                  className="w-5 h-5"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                />
                <span className="text-sm font-semibold">Quality</span>
              </button>

              <div
                className="overflow-y-auto overflow-x-hidden"
                style={{
                  maxHeight: "min(50vh, 350px)",
                  overflowX: "hidden",
                }}
              >
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQualitySelect(q);
                    }}
                    disabled={isChanging}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between"
                    style={{
                      background:
                        currentQuality === q
                          ? "rgba(255, 255, 255, 0.08)"
                          : "transparent",
                      opacity: isChanging ? 0.5 : 1,
                      cursor: isChanging ? "not-allowed" : "pointer",
                      minHeight: "44px",
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-white">
                        {qualityLabels[q]?.short || q}
                      </span>
                      {q === "auto" && (
                        <span
                          className="text-xs"
                          style={{ color: "rgba(255, 255, 255, 0.6)" }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    {currentQuality === q && !isChanging && (
                      <Check
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "#ff0000" }}
                      />
                    )}
                    {isChanging && currentQuality === q && (
                      <div
                        className="w-5 h-5 rounded-full animate-spin"
                        style={{
                          border: "2px solid #ff0000",
                          borderTopColor: "transparent",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default QualitySelector;
export type { QualityType, QualitySelectorProps };
