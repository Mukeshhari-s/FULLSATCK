const API_URL = 'http://localhost:5000/api';

export const imageService = {
  async upload(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  },

  async delete(publicId) {
    const response = await fetch(`${API_URL}/upload/${publicId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    return response.json();
  }
};
