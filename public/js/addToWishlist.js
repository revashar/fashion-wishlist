document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".add-wishlist-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const itemId = btn.dataset.itemId;

      try {
        const res = await fetch(`/wishlist/add/${itemId}`, { method: "POST" });
        const data = await res.json();

        if (data.status === "already") {
          btn.replaceWith(createBadge("Already in wishlist"));
        } else if (data.status === "added") {
          btn.replaceWith(createBadge("Added to wishlist"));
        } else {
          alert("Something went wrong. Please try again.");
        }

      } catch (err) {
        console.error(err);
        alert("Error adding to wishlist.");
      }
    });
  });

  function createBadge(text) {
    const span = document.createElement("span");
    span.classList.add("wishlist-badge");
    span.textContent = text;
    return span;
  }
});
