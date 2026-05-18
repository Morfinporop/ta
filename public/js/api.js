class ApiClient {
  constructor() {
    this.baseURL = '/api';
  }

  async request(path, options = {}) {
    const url = `${this.baseURL}${path}`;
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers
      }
    };

    if (options.body && !(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          store.clearUser();
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            navigate('/login');
          }
        }
        if (response.status === 429) {
          Toast.show('Слишком много запросов, подождите немного', 'error');
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  get(path, params) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(path + query, { method: 'GET' });
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  }

  patch(path, body) {
    return this.request(path, { method: 'PATCH', body });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }

  async upload(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent, e.loaded, e.total);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (err) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Upload failed'));
          } catch (err) {
            reject(new Error('Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${this.baseURL}${path}`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }
}

const api = new ApiClient();
