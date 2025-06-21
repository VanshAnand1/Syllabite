import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Clock,
} from 'lucide-react';
import CalendarOverview from './CalendarOverview';

// --- Helper Functions & Constants ---
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // Set your API key here or in environment
const API_URL_FLASH = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const readPdfFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!window.pdfjsLib) {
          return reject(new Error("PDF.js library is not loaded."));
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

        const pdf = await window.pdfjsLib.getDocument({
          data: event.target.result,
        }).promise;
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

const readFileContent = (file) => {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "pdf") {
    return readPdfFile(file);
  } else if (extension === "txt" || extension === "md") {
    return readTextFile(file);
  } else {
    return Promise.reject(new Error(`Unsupported file type: ${extension}`));
  }
};

// --- Basic CSS styles instead of Tailwind ---
const styles = {
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    border: "1px solid #ccc",
    maxWidth: 600,
    margin: "20px auto",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: 24,
    borderBottom: "1px solid #ccc",
    display: "flex",
    alignItems: "center",
  },
  cardContent: {
    padding: 24,
  },
  cardFooter: {
    padding: 24,
    borderTop: "1px solid #ccc",
    textAlign: "right",
  },
  button: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "10px 20px",
    fontWeight: "600",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
    cursor: "not-allowed",
  },
  fileList: {
    listStyleType: "none",
    padding: 0,
    marginTop: 12,
  },
  fileItem: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: 16,
    borderRadius: 8,
    margin: "20px auto",
    maxWidth: 600,
    border: "1px solid #f87171",
  },
  loading: {
    textAlign: "center",
    padding: 40,
  },
  input: {
    width: "100%",
    padding: 8,
    fontSize: 16,
    borderRadius: 8,
    border: "1px solid #ccc",
    marginBottom: 16,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
    display: "block",
  },
  textarea: {
    width: "100%",
    padding: 8,
    fontSize: 16,
    borderRadius: 8,
    border: "1px solid #ccc",
    resize: "vertical",
  },
};

// --- UI Components ---
const Card = ({ children }) => <div style={styles.card}>{children}</div>;
const CardHeader = ({ children }) => <div style={styles.cardHeader}>{children}</div>;
const CardContent = ({ children }) => <div style={styles.cardContent}>{children}</div>;
const CardFooter = ({ children }) => <div style={styles.cardFooter}>{children}</div>;

const Button = ({ children, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={disabled ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
  >
    {children}
  </button>
);

const LoadingIndicator = ({ message }) => (
  <div style={styles.loading}>
    <div
      style={{
        width: 50,
        height: 50,
        border: "5px dashed #4f46e5",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        margin: "auto",
      }}
    />
    <p>{message}</p>
    <p style={{ fontSize: 12, color: "#666" }}>This may take a moment, please don&apos;t close the window.</p>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}
    </style>
  </div>
);

const ErrorDisplay = ({ message }) => <div style={styles.errorBox}><strong>Error:</strong> {message}</div>;

// --- Steps simplified (no icons to keep simple) ---
const WelcomeStep = ({ onComplete }) => {
  const [name, setName] = useState("");
  const [freeTime, setFreeTime] = useState("");

  const handleSubmit = () => {
    if (name && freeTime) onComplete({ name, freeTime });
  };

  return (
    <Card>
      <CardHeader>
        <h2>Welcome to AI Scheduler</h2>
      </CardHeader>
      <CardContent>
        <label style={styles.label} htmlFor="name">
          What's your name?
        </label>
        <input
          id="name"
          style={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Alex Doe"
        />
        <label style={styles.label} htmlFor="freeTime">
          When are you usually free to study?
        </label>
        <textarea
          id="freeTime"
          style={styles.textarea}
          value={freeTime}
          onChange={(e) => setFreeTime(e.target.value)}
          rows="3"
          placeholder="e.g., Weekday evenings after 6 PM, weekends, and Tuesday/Thursday mornings."
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={!name || !freeTime}>
          Next Step
        </Button>
      </CardFooter>
    </Card>
  );
};

const SyllabusUploadStep = ({ onGenerate, onReset }) => {
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files));
  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  return (
    <Card>
      <CardHeader>
        <h2>Upload Your Syllabi</h2>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
          style={{ marginBottom: 16 }}
        />
        {files.length > 0 && (
          <ul style={styles.fileList}>
            {files.map((file, i) => (
              <li key={i} style={styles.fileItem}>
                <span>{file.name}</span>
                <button onClick={() => removeFile(i)} style={{ cursor: "pointer" }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onReset}>Back</Button>
        <Button onClick={() => onGenerate(files)} disabled={files.length === 0}>
          Generate Schedule
        </Button>
      </CardFooter>
    </Card>
  );
};

const ScheduleStep = ({ schedule, icalData, onReset }) => {
  const downloadIcal = () => {
    const blob = new Blob([icalData], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-schedule.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortedSchedule = useMemo(() => {
    if (!schedule || !Array.isArray(schedule)) return [];
    return [...schedule].sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [schedule]);

  return (
    <Card>
      <CardHeader>
        <h2>Your Generated Schedule</h2>
      </CardHeader>
            <CardContent className="max-h-[50vh] overflow-y-auto">
                {/* Add the calendar overview here */}
                <CalendarOverview schedule={schedule} />

                {/* Your existing event list */}
                <ul className="space-y-4 mt-6">
                   {sortedSchedule.map((event, index) => (
                        <li key={index} className="p-4 bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                           <p className="font-bold text-indigo-700 dark:text-indigo-300">{event.title}</p>
                           <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <Clock className="w-4 h-4"/>
                                <span>
                                    {new Date(event.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                           </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
      <CardFooter>
        <Button onClick={onReset}>Start Over</Button>
        <Button onClick={downloadIcal}>Download .ical File</Button>
      </CardFooter>
    </Card>
  );
};

// --- Main App ---
export default function App() {
  const [step, setStep] = useState("welcome");
  const [userData, setUserData] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [icalData, setIcalData] = useState("");
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleWelcomeComplete = (data) => {
    setUserData(data);
    setStep("upload");
  };

  const handleGenerateSchedule = useCallback(
    async (files) => {
      if (files.length === 0) return;

      setStep("loading");
      setLoadingMessage("Reading your syllabi (PDFs may take longer)...");
      setError("");

      try {
        const fileContents = await Promise.all(files.map(readFileContent));

        // Step 1: Extract events from each syllabus file separately
        const allExtractedEvents = [];

        const extractionSchema = {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              courseName: { type: "STRING" },
              eventName: { type: "STRING" },
              date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
            },
            required: ["courseName", "eventName", "date"],
          },
        };

        for (const syllabusText of fileContents) {
          const extractionPrompt = `
You are an academic assistant. Your task is to analyze the following course syllabus and extract all important dates.
For each date, provide the event title, the course name, and the date.
It is now the year ${new Date().getFullYear()}. Assume all dates mentioned are for the current academic year.
Be precise with dates. If a date is "Oct 5", represent it as "${new Date().getFullYear()}-10-05".

Syllabus content:
${syllabusText}
`;

          const response = await fetch(API_URL_FLASH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: extractionSchema,
              },
            }),
          });

          if (!response.ok) {
            let errorDetails = `Status: ${response.status}. `;
            try {
              const errorData = await response.json();
              errorDetails += errorData.error?.message || JSON.stringify(errorData);
            } catch (e) {
              errorDetails += response.statusText;
            }
            throw new Error(`API Error during event extraction: ${errorDetails}`);
          }

          const result = await response.json();

          if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error(
              "Failed to extract events from one of the syllabi. They might be in an unsupported format or empty."
            );
          }
          const extractedEvents = JSON.parse(result.candidates[0].content.parts[0].text);

          if (extractedEvents && extractedEvents.length > 0) {
            allExtractedEvents.push(...extractedEvents);
          }
        }

        if (allExtractedEvents.length === 0) {
          throw new Error("No key dates could be found in the provided syllabi. Please check the files and try again.");
        }

        // Step 2: Generate schedule and iCal
        setLoadingMessage("Building your personalized schedule...");
        const schedulePrompt = `
You are an expert academic planner. A student named ${userData.name} needs a study schedule.
The student is generally free during these times: ${userData.freeTime}.
It is currently ${new Date().toDateString()}.

Here are their key deadlines and events:
${JSON.stringify(allExtractedEvents, null, 2)}

Create a comprehensive study schedule that includes both the original events and preparatory study sessions.
Schedule study sessions in the days leading up to each deadline or exam. For a major exam, schedule multiple sessions. For a small assignment, one or two might be enough.
All events in your final output should have a specific start time. For deadlines, assume they are due at 5:00 PM on the given date. For study sessions, schedule them during the student's free time.

Your final output must be a single JSON object with two keys: "schedule" and "ical".
1.  "schedule": An array of events. Each event object should have "title", "start" (full ISO 8601 format: YYYY-MM-DDTHH:MM:SS), and "end" (full ISO 8601 format).
2.  "ical": A string containing the full, valid iCalendar (.ics) data for ALL events (deadlines and study sessions).
    - It must start with 'BEGIN:VCALENDAR' and end with 'END:VCALENDAR'.
    - Each event must be a VEVENT with DTSTART, DTEND, SUMMARY, and a unique UID (e.g., using UUID format or timestamp).
`;

        const scheduleSchema = {
          type: "OBJECT",
          properties: {
            schedule: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  start: { type: "STRING", description: "Full ISO 8601 datetime" },
                  end: { type: "STRING", description: "Full ISO 8601 datetime" },
                },
                required: ["title", "start", "end"],
              },
            },
            ical: { type: "STRING", description: "A full, valid iCalendar (.ics) string." },
          },
          required: ["schedule", "ical"],
        };

        const response2 = await fetch(API_URL_FLASH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: schedulePrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: scheduleSchema,
            },
          }),
        });

        if (!response2.ok) {
          let errorDetails = `Status: ${response2.status}. `;
          try {
            const errorData = await response2.json();
            errorDetails += errorData.error?.message || JSON.stringify(errorData);
          } catch (e) {
            errorDetails += response2.statusText;
          }
          throw new Error(`API Error during schedule generation: ${errorDetails}`);
        }

        const result2 = await response2.json();

        const finalData = JSON.parse(result2.candidates[0].content.parts[0].text);

        setSchedule(finalData.schedule);
        setIcalData(finalData.ical);
        setStep("schedule");
      } catch (e) {
        console.error(e);
        setError(e.message || "An unknown error occurred.");
        setStep("error");
      }
    },
    [userData]
  );

  const handleReset = () => {
    setStep("welcome");
    setUserData(null);
    setSchedule(null);
    setIcalData("");
    setError("");
  };

  if (step === "welcome")
    return <WelcomeStep onComplete={handleWelcomeComplete} />;
  if (step === "upload")
    return <SyllabusUploadStep onGenerate={handleGenerateSchedule} onReset={handleReset} />;
  if (step === "loading")
    return <LoadingIndicator message={loadingMessage} />;
  if (step === "schedule")
    return <ScheduleStep schedule={schedule} icalData={icalData} onReset={handleReset} />;
  if (step === "error")
    return <ErrorDisplay message={error} />;

  return null;
}
