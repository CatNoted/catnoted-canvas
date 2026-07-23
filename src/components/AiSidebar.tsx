"use client";

import { useEffect, useState } from "react";
import { Editor, TLShape, createShapeId } from "tldraw";

interface AiSidebarProps {
  editor: Editor | null;
}

export default function AiSidebar({ editor }: AiSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");

  // Selection state
  const [selectedShapes, setSelectedShapes] = useState<TLShape[]>([]);
  
  // Execution state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("catnoted_ai_provider") as "gemini" | "openai" | null;
    const savedKey = localStorage.getItem("catnoted_ai_key") || "";
    const savedModel = localStorage.getItem("catnoted_ai_model");

    if (savedProvider) setProvider(savedProvider);
    if (savedKey) setApiKey(savedKey);
    
    if (savedModel) {
      setModel(savedModel);
    } else {
      setModel(savedProvider === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash");
    }
  }, []);

  // Update default model when provider changes
  const handleProviderChange = (p: "gemini" | "openai") => {
    setProvider(p);
    const defaultModel = p === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash";
    setModel(defaultModel);
  };

  // Save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("catnoted_ai_provider", provider);
    localStorage.setItem("catnoted_ai_key", apiKey);
    localStorage.setItem("catnoted_ai_model", model);
    setIsSettingsOpen(false);
    setErrorMessage("");
  };

  // Track selection changes on canvas
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      setSelectedShapes(editor.getSelectedShapes());
    };

    updateSelection();

    const unsub = editor.store.listen(
      () => {
        updateSelection();
      },
      { source: "user", scope: "all" }
    );

    return () => {
      unsub();
    };
  }, [editor]);

  // Extract text from selected shapes
  const getSelectedText = () => {
    return selectedShapes
      .map((s) => s.props && (s.props as any).text)
      .filter((t) => typeof t === "string" && t.trim() !== "")
      .join("\n");
  };

  const selectedText = getSelectedText();

  // Call AI API helper
  const callAI = async (prompt: string): Promise<string> => {
    if (!apiKey) {
      throw new Error("API Key is missing. Please configure it in the AI Settings.");
    }

    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Received empty response from Gemini API.");
      return text;
    } else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Received empty response from OpenAI API.");
      return text;
    }
  };

  // Summarize Action
  const handleSummarize = async () => {
    if (!editor || !selectedText) return;

    setIsLoading(true);
    setStatusMessage("Generating summary...");
    setErrorMessage("");

    try {
      const prompt = `Summarize the following notes concisely. Keep the formatting simple and clear. Return ONLY the summary text, with no preamble:\n\n${selectedText}`;
      const summary = await callAI(prompt);

      // Determine where to place the new note
      const bounds = editor.getSelectionPageBounds();
      let x = 0;
      let y = 0;

      if (bounds) {
        x = bounds.maxX + 80;
        y = bounds.minY;
      } else {
        const center = editor.getViewportPageBounds().center;
        x = center.x - 100;
        y = center.y - 100;
      }

      // Create sticky note shape
      editor.createShape({
        type: "note",
        x,
        y,
        props: {
          text: summary,
          color: "yellow",
        },
      });

      setStatusMessage("Summary note created!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during summarization.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Mindmap Action
  const handleGenerateMindmap = async () => {
    if (!editor || !selectedText) return;

    setIsLoading(true);
    setStatusMessage("Building mindmap structure...");
    setErrorMessage("");

    try {
      const prompt = `Generate a mindmap based on the following text. Break it down into a central concept and 3-5 sub-concepts (child nodes).
You MUST respond ONLY with a valid JSON array of nodes, with no markdown code block markers, no backticks, and no extra text.
Each node object in the array must strictly have these fields:
- id: string (unique identifier, e.g. "root", "child1", "child2")
- text: string (name of the concept, max 30 characters)
- parentId: string | null (ID of the parent node. The central concept must have parentId: null. All other nodes must have a parentId pointing to another node's id).

Text to process:
${selectedText}`;

      const responseText = await callAI(prompt);

      // Clean markdown JSON wrapper blocks if present
      let jsonString = responseText.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const nodes: Array<{ id: string; text: string; parentId: string | null }> = JSON.parse(jsonString);

      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error("Invalid response format. Expected a JSON array of nodes.");
      }

      // Determine center placement
      const bounds = editor.getSelectionPageBounds();
      let centerX = 0;
      let centerY = 0;

      if (bounds) {
        centerX = bounds.maxX + 250;
        centerY = bounds.center.y;
      } else {
        const center = editor.getViewportPageBounds().center;
        centerX = center.x;
        centerY = center.y;
      }

      // Map node IDs to tldraw generated shape IDs
      const tldrawIds = new Map<string, any>();
      nodes.forEach((node) => {
        tldrawIds.set(node.id, createShapeId());
      });

      // Layout and create shapes
      const rootNode = nodes.find((n) => n.parentId === null) || nodes[0];
      const children = nodes.filter((n) => n.parentId === rootNode.id);
      
      // Create root shape
      const rootTldrawId = tldrawIds.get(rootNode.id);
      editor.createShape({
        id: rootTldrawId,
        type: "geo",
        x: centerX - 80,
        y: centerY - 40,
        props: {
          geo: "ellipse",
          w: 160,
          h: 80,
          text: rootNode.text,
          color: "orange",
        },
      });

      // Place children radially around the root node
      const radius = 220;
      children.forEach((child, index) => {
        const angle = (index * 2 * Math.PI) / children.length;
        const posX = centerX + radius * Math.cos(angle);
        const posY = centerY + radius * Math.sin(angle);
        const childTldrawId = tldrawIds.get(child.id);

        editor.createShape({
          id: childTldrawId,
          type: "geo",
          x: posX - 70,
          y: posY - 30,
          props: {
            geo: "rectangle",
            w: 140,
            h: 60,
            text: child.text,
            color: "blue",
          },
        });

        // Connect child to root with arrow binding
        editor.createShape({
          type: "arrow",
          props: {
            start: {
              type: "binding",
              boundShapeId: rootTldrawId,
              normalizedAnchor: { x: 0.5, y: 0.5 },
              isExact: false,
            },
            end: {
              type: "binding",
              boundShapeId: childTldrawId,
              normalizedAnchor: { x: 0.5, y: 0.5 },
              isExact: false,
            },
          },
        });

        // Check if this child has grandchildren
        const grandchildren = nodes.filter((n) => n.parentId === child.id);
        grandchildren.forEach((gc, gcIndex) => {
          // Place grandchildren slightly offset further out
          const offsetAngle = angle + (gcIndex - (grandchildren.length - 1) / 2) * 0.4;
          const gcX = centerX + (radius + 180) * Math.cos(offsetAngle);
          const gcY = centerY + (radius + 180) * Math.sin(offsetAngle);
          const gcTldrawId = tldrawIds.get(gc.id);

          editor.createShape({
            id: gcTldrawId,
            type: "geo",
            x: gcX - 60,
            y: gcY - 25,
            props: {
              geo: "rectangle",
              w: 120,
              h: 50,
              text: gc.text,
              color: "green",
            },
          });

          // Connect grandchild to child with arrow binding
          editor.createShape({
            type: "arrow",
            props: {
              start: {
                type: "binding",
                boundShapeId: childTldrawId,
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
              },
              end: {
                type: "binding",
                boundShapeId: gcTldrawId,
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
              },
            },
          });
        });
      });

      setStatusMessage("Mindmap created!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during mindmap generation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Helper Panel"
        className="fixed bottom-6 right-6 z-[1000] flex h-12 w-12 items-center justify-center rounded-full border border-paper/20 bg-void text-amber shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
        </svg>
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-14 bottom-0 right-0 z-[999] w-80 border-l border-paper/15 bg-void p-4 font-mono shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-paper/10 pb-3">
            <h2 className="text-md font-bold uppercase tracking-wider text-amber flex items-center gap-2">
              <span className="animate-pulse">●</span> AI Assistant
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                aria-label="Settings"
                className="text-paper/60 hover:text-amber"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close panel"
                className="text-paper/60 hover:text-paper"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Settings Overlay Form */}
          {isSettingsOpen ? (
            <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col gap-4 py-4">
              <h3 className="text-sm font-bold text-paper border-b border-paper/10 pb-1">AI CONFIGURATION (BYOK)</h3>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-paper/60 uppercase">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as "gemini" | "openai")}
                  className="w-full bg-void border border-paper/20 rounded px-2 py-1 text-sm text-paper focus:border-amber focus:outline-none"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-paper/60 uppercase">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-void border border-paper/20 rounded px-2 py-1 text-sm text-paper focus:border-amber focus:outline-none"
                >
                  {provider === "gemini" ? (
                    <>
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="gpt-4o">gpt-4o</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-paper/60 uppercase">API Key</label>
                <input
                  type="password"
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-void border border-paper/20 rounded px-2 py-1 text-sm text-paper focus:border-amber focus:outline-none"
                />
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 border border-paper/15 rounded py-1.5 text-xs text-paper/70 hover:bg-paper/5 hover:text-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber text-void font-bold rounded py-1.5 text-xs hover:bg-amber/80"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            /* Main Actions View */
            <div className="flex-1 flex flex-col gap-4 py-4 overflow-y-auto">
              {/* API status badge */}
              <div className="flex items-center gap-2 rounded bg-paper/5 px-2.5 py-1.5 border border-paper/10 text-xs">
                <div className={`h-2.5 w-2.5 rounded-full ${apiKey ? "bg-moss" : "bg-destructive animate-pulse"}`} />
                <span className="text-paper/80 uppercase">
                  {apiKey ? `${provider} ready` : "API Key Required"}
                </span>
                {!apiKey && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="ml-auto text-amber hover:underline text-[10px] uppercase font-bold"
                  >
                    Setup
                  </button>
                )}
              </div>

              {/* Selection Status */}
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-bold text-paper/60 uppercase">Selected Items</h4>
                <div className="rounded border border-paper/10 bg-void p-2.5 min-h-[60px] flex items-center justify-center">
                  {selectedShapes.length === 0 ? (
                    <p className="text-[11px] text-paper/40 text-center">
                      Select notes or text boxes on the canvas to analyze.
                    </p>
                  ) : selectedText ? (
                    <div className="w-full text-xs text-paper/80 max-h-24 overflow-y-auto break-all">
                      <p className="font-bold text-[10px] text-moss mb-1 uppercase">
                        ✓ {selectedShapes.length} item(s) selected
                      </p>
                      <p className="italic text-[11px] font-mono line-clamp-3">&ldquo;{selectedText}&rdquo;</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-paper/40 text-center">
                      Selected shapes do not contain readable text.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSummarize}
                  disabled={isLoading || !selectedText || !apiKey}
                  className="flex w-full items-center justify-center gap-2 rounded border border-amber/35 bg-void px-3 py-2 text-xs font-bold text-amber hover:bg-amber/10 active:bg-amber/20 disabled:border-paper/10 disabled:text-paper/30 disabled:bg-void"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v18" />
                    <path d="M3 12h18" />
                  </svg>
                  SUMMARIZE SELECTION
                </button>

                <button
                  onClick={handleGenerateMindmap}
                  disabled={isLoading || !selectedText || !apiKey}
                  className="flex w-full items-center justify-center gap-2 rounded border border-moss/35 bg-void px-3 py-2 text-xs font-bold text-moss hover:bg-moss/10 active:bg-moss/20 disabled:border-paper/10 disabled:text-paper/30 disabled:bg-void"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 12h6" />
                    <path d="M12 9v6" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  GENERATE MINDMAP
                </button>
              </div>

              {/* Status and Error logs */}
              {statusMessage && (
                <div className="mt-4 rounded bg-moss/10 border border-moss/20 p-2 text-[11px] text-moss text-center">
                  {statusMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 rounded bg-destructive/10 border border-destructive/20 p-2 text-[11px] text-destructive break-all">
                  ERROR: {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
