// Node 22 marks node:sqlite as experimental and prints a warning on load.
// Hide only that warning; every other warning still goes to the default handler.
// Imported before node:sqlite so it is installed in time.
const defaultHandlers = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "ExperimentalWarning" && /SQLite/i.test(warning.message)) return;
  for (const handler of defaultHandlers) handler(warning);
});
