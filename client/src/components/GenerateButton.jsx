export default function GenerateButton() {
  return (
    <button className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_3px_8px_#00000062,0px_6px_20px_-8px__#000000a6] transition-all duration-300 ease-in-out active:shadow-noneh-9 w-36">
      <div
        className="px-4 text-[0.95rem] flex items-center justify-center gap-2  font-semibold  tracking-[0.5px]  border-b-[2.5px] border-solid border-[#374e72]  rounded-[12px]  bg-gradient-to-b from-[#5771a5] to-[#000000] text-white [text-shadow:1px_1px_#000,0_0_6px_#fff]  h- كامل h-full w-full">
        <div className="relative mt-px z-10 flex items-center [&>*]:[filter:drop-shadow(0_0_4px_#fff)_drop-shadow(1px_1px_0px_#000)]">
          <svg
            viewBox="0 0 256 256"
            className="w-[1.1em] h-[1.1em] fill-current"
          >
            <path d="M240 128a15.79 15.79 0 0 1-10.5 15l-63.44 23.07L143 229.5a16 16 0 0 1-30 0l-23.06-63.44L26.5 143a16 16 0 0 1 0-30l63.44-23.06L113 26.5a16 16 0 0 1 30 0l23.07 63.44L229.5 113a15.79 15.79 0 0 1 10.5 15" />
          </svg>
          <svg
            viewBox="0 0 256 256"
            className="absolute text-[0.6rem] left-[11px] top-[-5px] w-[1em] h-[1em] fill-current"
          >
            <path d="M240 128a15.79 15.79 0 0 1-10.5 15l-63.44 23.07L143 229.5a16 16 0 0 1-30 0l-23.06-63.44L26.5 143a16 16 0 0 1 0-30l63.44-23.06L113 26.5a16 16 0 0 1 30 0l23.07 63.44L229.5 113a15.79 15.79 0 0 1 10.5 15" />
          </svg>
        </div>

        Generate
      </div>
    </button>
  );
}