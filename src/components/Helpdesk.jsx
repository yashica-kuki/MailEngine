import { useState } from "react"
import { GoogleGenAI } from "@google/genai";

const Helpdesk = () => {
    const [subject, setSubject] = useState('');
    const [result, setResult] = useState('');


    const generateContent = async (e) => {
        e.preventDefault();
        if (!subject) {
            alert("Please enter a subject first!");
            return;
        }
        try {
            const apikey = import.meta.env.VITE_GEMINI_API_KEY;

            // Fixed key name capitalization (apiKey)
            const ai = new GoogleGenAI({ apiKey: apikey });

            const response = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: `Generate an Email Body for ${subject}`,
                config: {
                    systemInstruction: "You are a strict email body generator. Output ONLY a single, complete email body for the given subject. Do not include introductory text, multiple options, markdown titles (like ###), subject lines, or tips at the end. Start immediately with a greeting and end with a sign-off."
                },
            });

            setResult(response.text);
        } catch (error) {
            console.error("Error generating content", error);
        }
    }

    return (
        <>
            <div className="max-w-2xl mx-auto p-4">
                <div className="bg-gray-100 p-10 m-5">
                    <form action="/submit-post" method="POST">
                        <div className="mb-6">
                            <h2 className="font-bold text-2xl text-center">Email Generator</h2>
                            <div className="flex flex-row justify-between items-center p-3 py-4">
                                <label htmlFor="title" className="block items-center text-center text-lg font-medium text-gray-800 mb-1">Subject</label>
                                <button type="button" onClick={generateContent} className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_3px_8px_#00000062,0px_6px_20px_-8px__#000000a6] transition-all duration-300 ease-in-out active:shadow-none h-9 w-36">
                                    {/* Cleaned up "h- كامل h-full" typo here */}
                                    <div className="px-4 text-[0.95rem] flex items-center justify-center gap-2 font-semibold tracking-[0.5px] border-b-[2.5px] border-solid border-[#374e72] rounded-[12px] bg-gradient-to-b from-[#5771a5] to-[#000000] text-white [text-shadow:1px_1px_#000,0_0_6px_#fff] h-full w-full">
                                        <div className="relative mt-px z-10 flex items-center [&>*]:[filter:drop-shadow(0_0_4px_#fff)_drop-shadow(1px_1px_0px_#000)]">
                                            <svg viewBox="0 0 256 256" className="w-[1.1em] h-[1.1em] fill-current">
                                                <path d="M240 128a15.79 15.79 0 0 1-10.5 15l-63.44 23.07L143 229.5a16 16 0 0 1-30 0l-23.06-63.44L26.5 143a16 16 0 0 1 0-30l63.44-23.06L113 26.5a16 16 0 0 1 30 0l23.07 63.44L229.5 113a15.79 15.79 0 0 1 10.5 15" />
                                            </svg>
                                            <svg viewBox="0 0 256 256" className="absolute text-[0.6rem] left-[11px] top-[-5px] w-[1em] h-[1em] fill-current">
                                                <path d="M240 128a15.79 15.79 0 0 1-10.5 15l-63.44 23.07L143 229.5a16 16 0 0 1-30 0l-23.06-63.44L26.5 143a16 16 0 0 1 0-30l63.44-23.06L113 26.5a16 16 0 0 1 30 0l23.07 63.44L229.5 113a15.79 15.79 0 0 1 10.5 15" />
                                            </svg>
                                        </div>
                                        Generate
                                    </div>
                                </button>
                            </div>

                            <input value={subject} onChange={(e) => setSubject(e.target.value)} type="text" id="title" name="title" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500" required />
                        </div>


                        <div className="mb-6">
                            <label htmlFor="content" className="block text-lg font-medium text-gray-800 mb-1">body</label>
                            <textarea value={result} onChange={(e) => setResult(e.target.value)} id="content" name="content" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500" rows="6" required></textarea>
                        </div>

                        <div className="mb-6">
                            <div className="flex flex-row gap-2">
                                <div>
                                    <label className="font-semibold">CSV/TEXT files</label>
                                    <input type="file" id="image" name="image" accept=".csv" className="border border-1 p-1 w-full rounded-lg" />
                                </div>
                                <div>
                                    <label className="font-semibold">Attach files</label>
                                    <input type="file" id="image" name="image" accept="image/*" className="border border-1 p-1 w-full rounded-lg" />
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end">
                            <button type="submit" className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_3px_8px_#00000062,0px_6px_20px_-8px__#000000a6] transition-all duration-300 ease-in-out active:shadow-none h-9 w-36">
                                <div className="px-4 text-[0.95rem] flex items-center justify-center gap-2 font-semibold tracking-[0.5px] border-b-[2.5px] border-solid border-[#374e72] rounded-[12px] bg-gradient-to-b from-[#5771a5] to-[#000000] text-white [text-shadow:1px_1px_#000,0_0_6px_#fff] h-full w-full">
                                    Submit
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default Helpdesk;

