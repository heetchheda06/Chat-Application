// WaveChat Group Management Helper
document.addEventListener('DOMContentLoaded', () => {
  const createGroupForm = document.getElementById('createGroupForm');
  const groupMembersContainer = document.getElementById('groupMembersSelect');

  // Load available users to select as group members
  async function loadUsersForGroupSelection() {
    if (!groupMembersContainer) return;
    const res = await Auth.apiRequest('/api/users');
    if (res.ok && res.data.users) {
      groupMembersContainer.innerHTML = '';
      res.data.users.forEach((user) => {
        const div = document.createElement('div');
        div.className = 'form-check mb-2';
        div.innerHTML = `
          <input class="form-check-input group-member-checkbox" type="checkbox" value="${user._id}" id="user_check_${user._id}">
          <label class="form-check-label d-flex align-items-center gap-2" for="user_check_${user._id}">
            <img src="${user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}" width="24" height="24" class="rounded-circle">
            <span class="fw-medium">${user.fullName}</span>
            <span class="text-muted small">(@${user.username})</span>
          </label>
        `;
        groupMembersContainer.appendChild(div);
      });
    }
  }

  // Populate users whenever the create group modal is opened
  const newGroupModal = document.getElementById('newGroupModal');
  if (newGroupModal) {
    newGroupModal.addEventListener('show.bs.modal', loadUsersForGroupSelection);
  }

  // Handle group creation submit
  if (createGroupForm) {
    createGroupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const groupNameInput = document.getElementById('groupNameInput');
      const groupDescInput = document.getElementById('groupDescInput');
      const submitBtn = document.getElementById('submitCreateGroupBtn');

      const name = groupNameInput?.value.trim();
      const description = groupDescInput?.value.trim();

      if (!name) {
        alert('Please enter a group name.');
        return;
      }

      const checkboxes = document.querySelectorAll('.group-member-checkbox:checked');
      const memberIds = Array.from(checkboxes).map((cb) => cb.value);

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Creating...';

      const res = await Auth.apiRequest('/api/groups', 'POST', {
        name,
        description,
        memberIds,
      });

      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Create Group';

      if (res.ok && res.data.group) {
        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(newGroupModal);
        if (modalInstance) modalInstance.hide();
        createGroupForm.reset();

        // Reload page or reload sidebar
        window.location.reload();
      } else {
        alert(res.data.message || 'Error creating group.');
      }
    });
  }
});
