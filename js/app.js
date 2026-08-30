import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function generateReference() {
  const now = new Date();
  return `BH-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function saveRequestLocally(requestData) {
  const storageKey = `gsmxpand-unlock-${requestData.reference}`;
  localStorage.setItem(storageKey, JSON.stringify(requestData));
  return Promise.resolve(requestData.reference);
}

async function saveRequest(requestData) {
  try {
    await addDoc(collection(db, "requests"), { ...requestData, createdAt: serverTimestamp() });
    return requestData.reference;
  } catch (err) {
    return saveRequestLocally(requestData);
  }
}

async function getStatusByReference(reference) {
  try {
    const q = query(collection(db, "requests"), where("reference", "==", reference));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } catch (err) {
    const saved = localStorage.getItem(`gsmxpand-unlock-${reference}`);
    return saved ? JSON.parse(saved) : null;
  }
}

function buildUnlockMessage(requestData) {
  return `📱 *UNLOCK REQUEST*\n\n👤 Name: ${requestData.name}\n\n📞 Phone: ${requestData.phone}\n\n📲 Brand: ${requestData.brand}\n\n📱 Model: ${requestData.model}\n\n🔓 Service: ${requestData.service}\n\n📝 Problem:\n${requestData.problem}`;
}

window.checkStatus = async function () {
  const ref = document.getElementById("ref").value.trim();
  if (ref === "") {
    alert("Enter your reference number.");
    return;
  }

  const result = document.getElementById("result");
  const refno = document.getElementById("refno");
  const status = document.getElementById("status");
  const progress = document.getElementById("progress");

  result.style.display = "block";
  refno.textContent = ref;
  status.textContent = "Loading...";
  progress.textContent = "Checking the database...";

  try {
    const requestData = await getStatusByReference(ref);
    if (!requestData) {
      status.textContent = "Not found";
      progress.textContent = "No request was found for this reference number.";
      return;
    }

    status.textContent = requestData.status || "Received";
    progress.textContent = requestData.progress || "Your request is being reviewed.";
  } catch (e) {
    status.textContent = "Unavailable";
    progress.textContent = "The status service is temporarily unavailable.";
  }
};

document.addEventListener("DOMContentLoaded", function () {
  const unlockForm = document.getElementById("unlockForm");

  if (unlockForm) {
    unlockForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const requestData = {
        reference: generateReference(),
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        brand: document.getElementById("brand").value,
        model: document.getElementById("model").value.trim(),
        service: document.getElementById("service").value,
        problem: document.getElementById("problem").value.trim(),
        status: "Received",
        progress: "Your request has been received."
      };

      const message = buildUnlockMessage(requestData);
      const url = "https://wa.me/265984820687?text=" + encodeURIComponent(message);
      window.open(url, "_blank");

      try {
        await saveRequest(requestData);
        alert(`Request submitted successfully. Your reference number is ${requestData.reference}`);
      } catch (err) {
        alert("Your request was prepared, but the database could not be reached. Please contact us directly.");
      }
    });
  }

  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const message = document.getElementById("message").value.trim();

      try {
        await addDoc(collection(db, "messages"), {
          name,
          email,
          message,
          createdAt: serverTimestamp()
        });

        alert("Thank you! Your message has been sent.");
        contactForm.reset();
      } catch (err) {
        console.error(err);
        alert("Unable to send your message.");
      }
    });
  }
});

window.GSMXpandUnlockApp = {
  generateReference,
  saveRequest,
  getStatusByReference
};