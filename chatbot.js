const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");

function addMessage(message, sender) {
  const msg = document.createElement("div");
  msg.className = sender;
  msg.textContent = message;
  chatLog.appendChild(msg);
}

function handleUserInput() {
  const input = userInput.value.toLowerCase();
  addMessage(input, "user");
  userInput.value = "";

  let response = "Sorry, I don't understand that yet.";

  if (input.includes("hello")) {
    response = "Yo! I'm Jack's assistant. How can I help you?";
  } else if (input.includes("project")) {
    response = "Check out Jack's projects — he’s got some serious heat 🔥!";
  } else if (input.includes("contact")) {
    response = "Shoot him an email at: jack@yourmail.com 📧";
  }

  addMessage(response, "bot");
}
