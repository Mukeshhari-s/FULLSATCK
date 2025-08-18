const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiService = {
  // GET request example
  getData: async () => {
    try {
      const response = await fetch(`${API_URL}/api/data`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },

  // POST request example
  createData: async (data) => {
    try {
      const response = await fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating data:', error);
      throw error;
    }
  }
};
