import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ---------------------------------------------------------------
   Lightweight toast notifications.
   Injected entirely from JS so no HTML/CSS changes are required.
   --------------------------------------------------------------- */
function ensureToastStyles() {
  if (document.getElementById("gsmx-toast-styles")) return;
  const style = document.createElement("style");
  style.id = "gsmx-toast-styles";
  style.textContent = `
    #gsmx-toast-container{position:fixed;bottom:100px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:10px;max-width:320px;}
    .gsmx-toast{background:#0b132b;color:#fff;padding:14px 18px;border-radius:10px;box-shadow:0 10px 26px rgba(15,23,42,.25);font-size:14px;line-height:1.5;opacity:0;transform:translateY(10px);transition:opacity .25s ease, transform .25s ease;}
    .gsmx-toast.show{opacity:1;transform:translateY(0);}
    .gsmx-toast.success{border-left:4px solid #25d366;}
    .gsmx-toast.error{border-left:4px solid #b91c1c;}
    @media (max-width:480px){#gsmx-toast-container{right:12px;left:12px;max-width:none;bottom:96px;}}
  `;
  document.head.appendChild(style);
}

function showToast(message, type = "success", timeout = 6000) {
  ensureToastStyles();
  let container = document.getElementById("gsmx-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "gsmx-toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `gsmx-toast ${type}`;
  toast.textContent = message; // textContent only — never render user input as HTML
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, timeout);
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    if (loadingText) button.textContent = loadingText;
    button.disabled = true;
  } else {
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    button.disabled = false;
  }
}

/* ---------------------------------------------------------------
   Core request/status logic (unchanged behavior, same field names)
   --------------------------------------------------------------- */
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
    // Reference number is used as the document ID itself (not just a field).
    // This lets Firestore rules allow "fetch this one known ID" for status
    // checks, without opening up read access to every request on file.
    await setDoc(doc(db, "requests", requestData.reference), {
      ...requestData,
      createdAt: serverTimestamp()
    });
    return requestData.reference;
  } catch (err) {
    return saveRequestLocally(requestData);
  }
}

async function getStatusByReference(reference) {
  try {
    const snap = await getDoc(doc(db, "requests", reference));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (err) {
    const saved = localStorage.getItem(`gsmxpand-unlock-${reference}`);
    return saved ? JSON.parse(saved) : null;
  }
}

function buildUnlockMessage(requestData) {
  return `📱 *UNLOCK REQUEST*\n\n👤 Name: ${requestData.name}\n\n📞 Phone: ${requestData.phone}\n\n📲 Brand: ${requestData.brand}\n\n📱 Model: ${requestData.model}\n\n🔓 Service: ${requestData.service}\n\n📝 Problem:\n${requestData.problem}`;
}

/* ---------------------------------------------------------------
   Status checker — same element ids as before (ref, result, refno,
   status, progress), plus Enter-key support and a ?ref= deep link.
   --------------------------------------------------------------- */
window.checkStatus = async function () {
  const refInput = document.getElementById("ref");
  const ref = refInput.value.trim();
  if (ref === "") {
    showToast("Please enter your reference number.", "error");
    refInput.focus();
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
  /* Status page: Enter key + auto-check via ?ref=XXXX */
  const refInput = document.getElementById("ref");
  if (refInput) {
    refInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.checkStatus();
      }
    });

    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref");
    if (urlRef) {
      refInput.value = urlRef;
      window.checkStatus();
    }
  }

  /* Request Unlock form */
  const unlockForm = document.getElementById("unlockForm");

  if (unlockForm) {
    unlockForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const submitBtn = unlockForm.querySelector('button[type="submit"]');

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

      if (!requestData.name || !requestData.phone || !requestData.brand || !requestData.model || !requestData.service) {
        showToast("Please fill in all required fields before submitting.", "error");
        return;
      }

      const message = buildUnlockMessage(requestData);
      const url = "https://wa.me/265984820687?text=" + encodeURIComponent(message);
      // Opened synchronously (before any await) so browsers don't treat it as a blocked popup.
      window.open(url, "_blank");

      setButtonLoading(submitBtn, true, "Saving your request...");
      try {
        await saveRequest(requestData);
        showToast(
          `Request submitted! Your reference number is ${requestData.reference} — copied to your clipboard. Use it on the Check Status page to track progress.`,
          "success",
          9000
        );
        if (navigator.clipboard) {
          navigator.clipboard.writeText(requestData.reference).catch(() => {});
        }
        unlockForm.reset();
      } catch (err) {
        showToast(
          "Your WhatsApp message was prepared, but we couldn't save your request automatically. Please mention this when you message us.",
          "error",
          9000
        );
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  /* Contact form */
  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const message = document.getElementById("message").value.trim();

      setButtonLoading(submitBtn, true, "Sending...");
      try {
        await addDoc(collection(db, "messages"), {
          name,
          email,
          message,
          createdAt: serverTimestamp()
        });

        showToast("Thank you! Your message has been sent — we'll get back to you soon.", "success");
        contactForm.reset();
      } catch (err) {
        console.error(err);
        showToast("Unable to send your message right now. Please try WhatsApp instead.", "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }
});

window.GSMXpandUnlockApp = {
  generateReference,
  saveRequest,
  getStatusByReference
};
