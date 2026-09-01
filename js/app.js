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
   Status color coding
   --------------------------------------------------------------- */
function getStatusColor(status) {
  const statusColors = {
    "Received": { text: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },           // Blue
    "In Progress": { text: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },         // Amber/Orange
    "Awaiting Info": { text: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },        // Red
    "Completed": { text: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },           // Green
    "Not found": { text: "#6b7280", bg: "rgba(107, 114, 128, 0.15)" }            // Gray
  };
  return statusColors[status] || { text: "#0b132b", bg: "#f3f4f6" };
}

function applyStatusColor(statusElement, statusText) {
  if (!statusElement) return;
  const colors = getStatusColor(statusText);
  
  // Clear existing classes and apply strong styling
  statusElement.className = "";
  statusElement.setAttribute("style", `
    color: ${colors.text} !important;
    font-weight: 700 !important;
    font-size: 18px !important;
    padding: 12px 20px !important;
    border-radius: 8px !important;
    background-color: ${colors.bg} !important;
    display: inline-block !important;
    border: 2px solid ${colors.text} !important;
    margin: 10px 0 !important;
  `);
}

/* ---------------------------------------------------------------
   Success modal for request submission
   --------------------------------------------------------------- */
function showSuccessModal(reference, whatsappUrl) {
  if (document.getElementById("gsmx-success-modal-styles")) return;
  
  // Add modal styles
  const style = document.createElement("style");
  style.id = "gsmx-success-modal-styles";
  style.textContent = `
    #gsmx-success-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:3000;}
    .gsmx-modal-content{background:#fff;border-radius:15px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
    .gsmx-modal-icon{font-size:60px;margin-bottom:20px;}
    .gsmx-modal-title{font-size:22px;font-weight:bold;color:#0b132b;margin-bottom:10px;}
    .gsmx-modal-ref{font-size:14px;color:#666;margin-bottom:20px;word-break:break-all;}
    .gsmx-modal-ref strong{color:#0b132b;font-size:16px;}
    .gsmx-modal-message{font-size:16px;color:#333;margin-bottom:30px;line-height:1.6;}
    .gsmx-modal-buttons{display:flex;gap:12px;justify-content:center;}
    .gsmx-modal-btn{padding:12px 28px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s ease;}
    .gsmx-modal-btn-no{background:#f0f0f0;color:#333;}
    .gsmx-modal-btn-no:hover{background:#e0e0e0;}
    .gsmx-modal-btn-yes{background:#25d366;color:#fff;}
    .gsmx-modal-btn-yes:hover{background:#1fa857;}
    @media (max-width:480px){.gsmx-modal-content{padding:30px 20px;}.gsmx-modal-buttons{flex-direction:column;}.gsmx-modal-btn{width:100%;}}
  `;
  document.head.appendChild(style);
  
  // Create modal
  const modal = document.createElement("div");
  modal.id = "gsmx-success-modal";
  modal.innerHTML = `
    <div class="gsmx-modal-content">
      <div class="gsmx-modal-icon">✅</div>
      <h2 class="gsmx-modal-title">Request Submitted Successfully!</h2>
      <div class="gsmx-modal-ref">Your reference number is<br><strong>${reference}</strong></div>
      <p class="gsmx-modal-message">Would you like to continue the conversation on WhatsApp?</p>
      <div class="gsmx-modal-buttons">
        <button class="gsmx-modal-btn gsmx-modal-btn-no" id="modal-no-btn">No</button>
        <button class="gsmx-modal-btn gsmx-modal-btn-yes" id="modal-yes-btn">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Button handlers
  document.getElementById("modal-no-btn").addEventListener("click", () => {
    modal.remove();
  });
  
  document.getElementById("modal-yes-btn").addEventListener("click", () => {
    modal.remove();
    window.open(whatsappUrl, "_blank");
  });
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
      applyStatusColor(status, "Not found");
      progress.textContent = "No request was found for this reference number.";
      return;
    }

    const statusText = requestData.status || "Received";
    status.textContent = statusText;
    applyStatusColor(status, statusText);
    progress.textContent = requestData.progress || "Your request is being reviewed.";
  } catch (e) {
    status.textContent = "Unavailable";
    applyStatusColor(status, "Not found");
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
      const whatsappUrl = "https://wa.me/265984820687?text=" + encodeURIComponent(message);

      setButtonLoading(submitBtn, true, "Saving your request...");
      try {
        await saveRequest(requestData);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(requestData.reference).catch(() => {});
        }
        unlockForm.reset();
        setButtonLoading(submitBtn, false);
        // Show success modal with WhatsApp option
        showSuccessModal(requestData.reference, whatsappUrl);
      } catch (err) {
        showToast(
          "Unable to save your request. Please try again or contact us on WhatsApp.",
          "error",
          9000
        );
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
      const msgText = document.getElementById("message").value.trim();

      setButtonLoading(submitBtn, true, "Sending...");
      try {
        await addDoc(collection(db, "messages"), {
          name,
          email,
          message: msgText,
          createdAt: serverTimestamp()
        });

        contactForm.reset();
        setButtonLoading(submitBtn, false);
        
        // Show success modal
        if (document.getElementById("gsmx-contact-success-modal-styles")) return;
        const style = document.createElement("style");
        style.id = "gsmx-contact-success-modal-styles";
        style.textContent = `
          #gsmx-contact-success-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:3000;}
          .gsmx-contact-modal-content{background:#fff;border-radius:15px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
          .gsmx-contact-modal-icon{font-size:60px;margin-bottom:20px;}
          .gsmx-contact-modal-title{font-size:22px;font-weight:bold;color:#0b132b;margin-bottom:20px;}
          .gsmx-contact-modal-message{font-size:16px;color:#333;margin-bottom:30px;line-height:1.6;}
          .gsmx-contact-modal-btn{padding:12px 28px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;background:#0b132b;color:#fff;transition:all 0.3s ease;}
          .gsmx-contact-modal-btn:hover{background:#0d1633;}
          @media (max-width:480px){.gsmx-contact-modal-content{padding:30px 20px;}}
        `;
        document.head.appendChild(style);
        
        const modal = document.createElement("div");
        modal.id = "gsmx-contact-success-modal";
        modal.innerHTML = `
          <div class="gsmx-contact-modal-content">
            <div class="gsmx-contact-modal-icon">✅</div>
            <h2 class="gsmx-contact-modal-title">Message Sent Successfully!</h2>
            <p class="gsmx-contact-modal-message">Thank you! We've received your message and will get back to you soon.</p>
            <button class="gsmx-contact-modal-btn" id="contact-modal-close">Close</button>
          </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById("contact-modal-close").addEventListener("click", () => {
          modal.remove();
        });
      } catch (err) {
        console.error(err);
        showToast("Unable to send your message right now. Please try WhatsApp instead.", "error");
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
