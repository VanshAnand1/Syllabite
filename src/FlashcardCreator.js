import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react'; // Example icons

// --- Helper Functions & Constants (Reused from your existing code) ---
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // Ensure this is set in your environment
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Reads text-based files (.txt, .md)
const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Reads text content from a PDF file
const readPdfFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!window.pdfjsLib) {
          return reject(new Error("PDF.js library is not loaded."));
        }
        // Configure the workerSrc for pdf.js
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

        const pdf = await window.pdfjsLib.getDocument({ data: event.target.result }).promise;
        let allText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          allText += pageText + "\n\n";
        }
        resolve(allText);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Determines which file reader to use based on extension
const readFileContent = (file) => {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "pdf") {
    return readPdfFile(file);
  } else if (extension === "txt" || extension === "md") {
    return readTextFile(file);
  } else {
    // A more user-friendly error for unsupported types
    return Promise.reject(new Error(`Unsupported file type: .${extension}. Please upload a .pdf, .txt, or .md file.`));
  }
};

// --- Basic CSS styles (Consistent with your provided code) ---
const styles = {
  card: { backgroundColor: "white", borderRadius: 16, border: "1px solid #ccc", maxWidth: 800, margin: "20px auto", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", overflow: "hidden" },
  cardHeader: { padding: 24, borderBottom: "1px solid #ccc", display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardContent: { padding: 24 },
  cardFooter: { padding: 24, borderTop: "1px solid #ccc", display: "flex", justifyContent: "space-between", alignItems: "center" },
  button: { backgroundColor: "#4f46e5", color: "white", padding: "10px 20px", fontWeight: "600", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  buttonDisabled: { backgroundColor: "#aaa", cursor: "not-allowed" },
  errorBox: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 16, borderRadius: 8, margin: "20px auto", maxWidth: 600, border: "1px solid #f87171" },
  loading: { textAlign: "center", padding: 40 },
  fileInputLabel: { display: "block", backgroundColor: "#f0f0f0", padding: "30px", borderRadius: 8, border: "2px dashed #ccc", textAlign: "center", cursor: "pointer", marginBottom: 16 },
  fileInfo: { backgroundColor: "#eef2ff", padding: 12, borderRadius: 8, border: "1px solid #c7d2fe", display: "flex", justifyContent: "space-between", alignItems: "center" },
  flashcardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 },
  flashcard: { backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: 16, height: 200, perspective: "1000px", cursor: "pointer" },
  flashcardInner: { position: "relative", width: "100%", height: "100%", transition: "transform 0.6s", transformStyle: "preserve-3d" },
  flashcardFlipped: { transform: "rotateY(180deg)" },
  flashcardFace: { position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 10, flexDirection: "column" },
  flashcardBack: { transform: "rotateY(180deg)", backgroundColor: "#f9fafb" },
  flashcardLabel: { fontSize: 12, fontWeight: "bold", color: "#4f46e5", textTransform: "uppercase", marginBottom: 8 },
};

// --- UI Components ---
const Card = ({ children }) => <div style={styles.card}>{children}</div>;
const CardHeader = ({ children }) => <div style={styles.cardHeader}>{children}</div>;
const CardContent = ({ children }) => <div style={styles.cardContent}>{children}</div>;
const CardFooter = ({ children }) => <div style={styles.cardFooter}>{children}</div>;
const Button = ({ children, onClick, disabled }) => (<button onClick={onClick} disabled={disabled} style={disabled ? { ...styles.button, ...styles.buttonDisabled } : styles.button}>{children}</button>);
const LoadingIndicator = ({ message }) => (
    <div style={styles.loading}>
        <div style={{ width: 50, height: 50, border: "5px dashed #4f46e5", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "auto" }} />
        <p>{message}</p>
        <p style={{ fontSize: 12, color: "#666" }}>This may take a moment, please don't close the window.</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);
const ErrorDisplay = ({ message, onReset }) => (
    <Card>
        <CardHeader><h2>An Error Occurred</h2></CardHeader>
        <CardContent>
            <div style={styles.errorBox}><strong>Error:</strong> {message}</div>
        </CardContent>
        <CardFooter>
            <Button onClick={onReset}><RefreshCw size={16} /> Try Again</Button>
        </CardFooter>
    </Card>
);


// --- Step Components ---

// Step 1: User uploads a lecture transcript
const TranscriptUploadStep = ({ onGenerate }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => setFile(null);

  return (
    <Card>
      <CardHeader><h2>Flashcard Creator</h2></CardHeader>
      <CardContent>
        <p style={{ margin: "0 0 16px 0", color: "#333" }}>Upload a lecture transcript (.pdf, .txt, .md) to automatically generate study flashcards.</p>
        <input type="file" id="file-upload" accept=".pdf,.txt,.md" onChange={handleFileChange} style={{ display: "none" }} />
        <label htmlFor="file-upload" style={styles.fileInputLabel}>
          {file ? `Processing: ${file.name}` : 'Click here to choose a file'}
        </label>
        {file && (
          <div style={styles.fileInfo}>
            <span>{file.name}</span>
            <button onClick={removeFile} style={{ cursor: "pointer", background: "none", border: "none", color: "#b91c1c", fontWeight: "bold" }}>Remove</button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div /> {/* Spacer */}
        <Button onClick={() => onGenerate(file)} disabled={!file}>Generate Flashcards</Button>
      </CardFooter>
    </Card>
  );
};

// Single, flippable flashcard component
const Flashcard = ({ question, answer }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div style={styles.flashcard} onClick={() => setIsFlipped(!isFlipped)}>
            <div style={{...styles.flashcardInner, ...(isFlipped ? styles.flashcardFlipped : {})}}>
                <div style={styles.flashcardFace}>
                    <div>
                        <div style={styles.flashcardLabel}>Question</div>
                        <p>{question}</p>
                    </div>
                </div>
                <div style={{...styles.flashcardFace, ...styles.flashcardBack}}>
                     <div>
                        <div style={styles.flashcardLabel}>Answer</div>
                        <p>{answer}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 2: Display the generated, interactive flashcards
const FlashcardDisplayStep = ({ flashcards, fileName, onReset }) => {
    const downloadAsTxt = () => {
        const content = flashcards.map(card => `Q: ${card.question}\nA: ${card.answer}`).join('\n\n---\n\n');
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName.split('.')[0]}-flashcards.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Card>
            <CardHeader>
                <h2>Your Flashcards for "{fileName}"</h2>
                <p style={{color: "#666", fontSize: "14px"}}>Click any card to flip it</p>
            </CardHeader>
            <CardContent>
                <div style={styles.flashcardGrid}>
                    {flashcards.map((card, index) => (
                        <Flashcard key={index} question={card.question} answer={card.answer} />
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={onReset}><RefreshCw size={16} /> Start Over</Button>
                <Button onClick={downloadAsTxt}><Download size={16} /> Download as .txt</Button>
            </CardFooter>
        </Card>
    );
};


// --- Main App Component ---
export default function FlashcardCreator() {
  const [step, setStep] = useState("upload"); // upload, loading, flashcards, error
  const [flashcards, setFlashcards] = useState([]);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [fileName, setFileName] = useState("");

  // Effect to load the pdf.js script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // Clean up the script when the component unmounts
      document.body.removeChild(script);
    };
  }, []);

  const handleGenerateFlashcards = useCallback(async (file) => {
    if (!file) return;

    setStep("loading");
    setLoadingMessage("Reading and analyzing your transcript...");
    setError("");
    setFileName(file.name);

    try {
      // 1. Read the file content using the helper function
      const transcriptText = await readFileContent(file);
      if (!transcriptText.trim()) {
          throw new Error("The uploaded file appears to be empty. Please provide a transcript with content.");
      }

      setLoadingMessage("Creating flashcards with Gemini AI...");

      // 2. Define the prompt and the required JSON output schema for Gemini
      const prompt = `
        You are an expert academic assistant specializing in learning and retention.
        Your task is to analyze the following lecture transcript and generate a set of high-quality flashcards to help a student study.
        Each flashcard should consist of a single, clear question and a concise, accurate answer.
        Focus on key definitions, important concepts, key figures or dates, and cause-and-effect relationships mentioned in the text.
        Avoid creating questions that are too broad or trivial. The goal is to create effective study material.

        Here is the lecture transcript:
        ---
        ${transcriptText}
        ---
      `;

      const flashcardSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING", description: "The question for the front of the flashcard." },
            answer: { type: "STRING", description: "The answer for the back of the flashcard." },
          },
          required: ["question", "answer"],
        },
      };

      // 3. Make the API call to Gemini
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: flashcardSchema,
          },
        }),
      });

      if (!response.ok) {
        let errorDetails = `API Error: Status ${response.status}.`;
        try {
          const errorData = await response.json();
          errorDetails += ` ${errorData.error?.message || ''}`;
        } catch (e) { /* Ignore if error body is not JSON */ }
        throw new Error(errorDetails);
      }

      const result = await response.json();
      const generatedFlashcards = JSON.parse(result.candidates[0].content.parts[0].text);

      if (!generatedFlashcards || generatedFlashcards.length === 0) {
        throw new Error("The AI could not generate flashcards from this transcript. It might be too short or lack clear concepts. Please try a different file.");
      }

      setFlashcards(generatedFlashcards);
      setStep("flashcards");

    } catch (e) {
      console.error(e);
      setError(e.message || "An unknown error occurred.");
      setStep("error");
    }
  }, []);

  const handleReset = () => {
    setStep("upload");
    setFlashcards([]);
    setError("");
    setFileName("");
  };

  // --- Render the current step ---
  if (step === "upload") {
    return <TranscriptUploadStep onGenerate={handleGenerateFlashcards} />;
  }
  if (step === "loading") {
    return <LoadingIndicator message={loadingMessage} />;
  }
  if (step === "flashcards") {
    return <FlashcardDisplayStep flashcards={flashcards} fileName={fileName} onReset={handleReset} />;
  }
  if (step === "error") {
    return <ErrorDisplay message={error} onReset={handleReset} />;
  }

  return null; // Should not be reached
}