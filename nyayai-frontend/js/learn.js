// js/learn.js

document.addEventListener("DOMContentLoaded", () => {
  const faqQuestions = document.querySelectorAll(".faq__question");

  faqQuestions.forEach(question => {
    question.addEventListener("click", () => {
      const isExpanded = question.getAttribute("aria-expanded") === "true";
      
      // Close all other elements if desired (optional)
      // faqQuestions.forEach(q => {
      //   q.setAttribute("aria-expanded", "false");
      //   q.nextElementSibling.classList.remove("show");
      // });

      // Toggle current element
      question.setAttribute("aria-expanded", !isExpanded);
      question.nextElementSibling.classList.toggle("show");
    });
  });
});
