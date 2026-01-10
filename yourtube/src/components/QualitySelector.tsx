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
  const [isDarkMode, setIsDarkMode] = useState(true);
  // Detect if dark mode is active
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark");

      console.log("🎨 Theme detection:", {
        htmlHasDark: document.documentElement.classList.contains("dark"),
        bodyHasDark: document.body.classList.contains("dark"),
        isDark,
      });

      setIsDarkMode(isDark);
    };

    checkDarkMode();
    setTimeout(checkDarkMode, 100);
    setTimeout(checkDarkMode, 500);

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", checkDarkMode);
    };
  }, []);
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
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark");
    console.log("🎨 Force check on menu open:", { isDark });
    setIsDarkMode(isDark);
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

  const getMobileMenuPosition = () => {
    if (!buttonRef.current) return { top: "calc(100% + 12px)" };

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const menuHeight = 400;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceAbove > spaceBelow && spaceAbove > menuHeight) {
      return { bottom: "calc(100% + 12px)", top: "auto" };
    }

    return { top: "calc(100% + 12px)", bottom: "auto" };
  };
  return (
    <div
      className="relative"
      data-quality-selector="true"
      style={{
        zIndex: 100,
        position: "relative",
        pointerEvents: "auto",
      }}
    >
      {/* Settings Button */}
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
      {/* MOBILE VIEW - Two-step menu */}
      {isMobile && isOpen && (
        <div
          ref={menuRef}
          className="rounded-2xl shadow-2xl"
          style={{
            position: "absolute",
            ...getMobileMenuPosition(),
            right: 0,
            background: isDarkMode
              ? "rgba(40, 40, 43, 0.98)"
              : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${
              isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"
            }`,
            width: "260px",
            minWidth: "260px",
            maxHeight: "min(60vh, 450px)",
            zIndex: 2147483647,
            boxShadow: isDarkMode
              ? "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255, 255, 255, 0.05)"
              : "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 0.5px rgba(0, 0, 0, 0.05)",
            overflow: "visible",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            isolation: "isolate",
            willChange: "transform",
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!showQualityMenu ? (
            /* Step 1: Settings menu showing "Quality" button */
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("📱 Quality menu button clicked");
                setShowQualityMenu(true);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className={`w-full px-5 py-3 text-left transition-colors flex items-center justify-between rounded-2xl touch-manipulation ${
                isDarkMode
                  ? "text-white hover:bg-white/10 active:bg-white/15"
                  : "text-gray-900 hover:bg-gray-100 active:bg-gray-200"
              }`}
              style={{
                minHeight: "56px",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-sm font-medium whitespace-nowrap ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Quality
                </span>
                <span
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {qualityLabels[currentQuality]?.short || currentQuality}
                </span>
              </div>
              <ChevronRight
                className={`w-5 h-5 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              />
            </button>
          ) : (
            /* Step 2: Quality options with back button */
            <>
              {/* Back button header */}
              <div
                className="flex items-center gap-3 px-5 py-4 border-b rounded-t-2xl"
                style={{
                  borderColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.08)",
                  background: isDarkMode
                    ? "rgba(50, 50, 53, 0.5)"
                    : "rgba(248, 249, 250, 0.8)",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQualityMenu(false);
                  }}
                  className="flex items-center justify-center -ml-2 p-2 rounded-lg transition-all hover:bg-white/10 active:scale-95"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <ChevronLeft
                    className="w-5 h-5"
                    style={{
                      color: isDarkMode ? "#ffffff" : "#1a1a1a",
                    }}
                  />
                </button>
                <h3
                  className="text-base font-semibold flex-1"
                  style={{
                    color: isDarkMode ? "#ffffff" : "#1a1a1a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Video Quality
                </h3>
              </div>
              {/* Quality options list */}
              <div
                className="overflow-y-auto overflow-x-hidden py-2"
                style={{
                  flex: 1,
                  maxHeight: "min(50vh, 380px)",
                  minHeight: "140px",
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  scrollbarColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.2) transparent"
                    : "rgba(0, 0, 0, 0.2) transparent",
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
                        handleQualitySelect(q);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      disabled={isChanging}
                      className="w-full px-5 py-3.5 text-left transition-all flex items-center justify-between group"
                      style={{
                        background: isActive
                          ? isDarkMode
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                        opacity: isChanging ? 0.5 : 1,
                        cursor: isChanging ? "not-allowed" : "pointer",
                        WebkitTapHighlightColor: "transparent",
                        borderLeft: isActive
                          ? `3px solid ${isDarkMode ? "#3b82f6" : "#2563eb"}`
                          : "3px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isChanging && !isActive) {
                          const target = e.currentTarget as HTMLButtonElement;
                          target.style.background = isDarkMode
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.03)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          const target = e.currentTarget as HTMLButtonElement;
                          target.style.background = "transparent";
                        }
                      }}
                    >
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-base font-semibold"
                            style={{
                              color: isActive
                                ? isDarkMode
                                  ? "#60a5fa"
                                  : "#2563eb"
                                : isDarkMode
                                ? "#ffffff"
                                : "#1a1a1a",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {label.full}
                          </span>
                          {q === "auto" && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: isDarkMode
                                  ? "rgba(34, 197, 94, 0.15)"
                                  : "rgba(34, 197, 94, 0.1)",
                                color: isDarkMode ? "#4ade80" : "#16a34a",
                              }}
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <span
                          className="text-xs"
                          style={{
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                          }}
                        >
                          {label.desc}
                        </span>
                      </div>
                      {isActive && !isChanging && (
                        <Check
                          className="w-5 h-5 flex-shrink-0 ml-3"
                          style={{
                            color: isDarkMode ? "#3b82f6" : "#2563eb",
                            strokeWidth: 2.5,
                          }}
                        />
                      )}
                      {isChanging && isActive && (
                        <div
                          className="w-5 h-5 rounded-full animate-spin flex-shrink-0 ml-3"
                          style={{
                            border: `2px solid ${
                              isDarkMode ? "#3b82f6" : "#2563eb"
                            }`,
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
      {/* DESKTOP VIEW - Two-step dropdown menu */}
      {!isMobile && isOpen && (
        <div
          ref={menuRef}
          className="rounded-xl shadow-2xl"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            right: 0,
            left: "auto",
            background: isDarkMode
              ? "rgba(40, 40, 43, 0.98)"
              : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${
              isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"
            }`,
            width: "240px",
            maxHeight: "min(55vh, 420px)",
            zIndex: 999999,
            boxShadow: isDarkMode
              ? "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255, 255, 255, 0.05)"
              : "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 0.5px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!showQualityMenu ? (
            /* Step 1: Settings menu showing "Quality" button */
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu(true);
              }}
              className="w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between"
              style={{
                minHeight: "52px",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.backgroundColor = isDarkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)";
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.backgroundColor = "transparent";
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isDarkMode ? "#ffffff" : "#000000",
                  }}
                >
                  Quality
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: isDarkMode ? "#9ca3af" : "#666666",
                  }}
                >
                  {qualityLabels[currentQuality]?.short || currentQuality}
                </span>
              </div>
              <ChevronRight
                className="w-5 h-5"
                style={{
                  color: isDarkMode ? "#9ca3af" : "#666666",
                }}
              />
            </button>
          ) : (
            /* Step 2: Quality options with back button */
            <>
              {/* Back button header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{
                  borderColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.08)",
                  background: isDarkMode
                    ? "rgba(50, 50, 53, 0.5)"
                    : "rgba(248, 249, 250, 0.8)",
                  borderTopLeftRadius: "12px",
                  borderTopRightRadius: "12px",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQualityMenu(false);
                  }}
                  className="flex items-center justify-center -ml-1 p-1.5 rounded-lg transition-all hover:bg-white/10 active:scale-95"
                >
                  <ChevronLeft
                    className="w-4 h-4"
                    style={{
                      color: isDarkMode ? "#ffffff" : "#1a1a1a",
                    }}
                  />
                </button>
                <h3
                  className="text-sm font-semibold flex-1"
                  style={{
                    color: isDarkMode ? "#ffffff" : "#1a1a1a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Video Quality
                </h3>
              </div>
              {/* Quality options */}
              <div
                className="overflow-y-auto overflow-x-hidden py-1"
                style={{
                  maxHeight: "min(50vh, 360px)",
                  scrollbarWidth: "thin",
                  scrollbarColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.2) transparent"
                    : "rgba(0, 0, 0, 0.2) transparent",
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
                      disabled={isChanging}
                      className="w-full px-4 py-3 text-left transition-all flex items-center justify-between"
                      style={{
                        background: isActive
                          ? isDarkMode
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                        opacity: isChanging ? 0.5 : 1,
                        cursor: isChanging ? "not-allowed" : "pointer",
                        minHeight: "44px",
                        borderLeft: isActive
                          ? `3px solid ${isDarkMode ? "#3b82f6" : "#2563eb"}`
                          : "3px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isChanging && !isActive) {
                          const target = e.currentTarget as HTMLButtonElement;
                          target.style.backgroundColor = isDarkMode
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.03)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLButtonElement;
                        if (!isActive) {
                          target.style.backgroundColor = "transparent";
                        } else {
                          target.style.backgroundColor = isDarkMode
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(59, 130, 246, 0.1)";
                        }
                      }}
                    >
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold"
                            style={{
                              color: isActive
                                ? isDarkMode
                                  ? "#60a5fa"
                                  : "#2563eb"
                                : isDarkMode
                                ? "#ffffff"
                                : "#1a1a1a",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {label.full}
                          </span>
                          {q === "auto" && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                background: isDarkMode
                                  ? "rgba(34, 197, 94, 0.15)"
                                  : "rgba(34, 197, 94, 0.1)",
                                color: isDarkMode ? "#4ade80" : "#16a34a",
                              }}
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <span
                          className="text-xs"
                          style={{
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                          }}
                        >
                          {label.desc}
                        </span>
                      </div>
                      {isActive && !isChanging && (
                        <Check
                          className="w-5 h-5 flex-shrink-0 ml-2"
                          style={{
                            color: isDarkMode ? "#3b82f6" : "#2563eb",
                            strokeWidth: 2.5,
                          }}
                        />
                      )}
                      {isChanging && isActive && (
                        <div
                          className="w-5 h-5 rounded-full animate-spin flex-shrink-0 ml-2"
                          style={{
                            border: `2px solid ${
                              isDarkMode ? "#3b82f6" : "#2563eb"
                            }`,
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
    </div>
  );
};
export default QualitySelector;
export type { QualityType, QualitySelectorProps };
