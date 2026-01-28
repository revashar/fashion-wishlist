document.addEventListener("DOMContentLoaded", () => {
  const deleteButtons = document.querySelectorAll(".delete-btn");

  deleteButtons.forEach(button => {
    button.addEventListener("click", event => {
      const confirmed = confirm("Are you sure you want to delete this item?");
      if (!confirmed) {
        event.preventDefault(); // stops deletion if user cancels
      }
    });
  });
});
