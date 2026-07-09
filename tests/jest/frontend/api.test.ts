/**
 * Frontend API service tests
 */

import * as api from '../../../src/services/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('api service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('apiFetch', () => {
    it('should fetch successfully with GET request', async () => {
      const mockData = { success: true, data: 'test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.apiFetch('/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should include custom headers', async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await api.apiFetch('/test', {
        headers: { 'X-Custom': 'value' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      );
    });

    it('should handle POST request with body', async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const body = { name: 'test' };
      await api.apiFetch('/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should throw error on failed response 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(api.apiFetch('/test')).rejects.toThrow('API /test failed (401): Unauthorized');
    });

    it('should throw error on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(api.apiFetch('/test')).rejects.toThrow('API /test failed (404): Not Found');
    });

    it('should throw error on 500', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(api.apiFetch('/test')).rejects.toThrow(
        'API /test failed (500): Internal Server Error'
      );
    });

    it('should use credentials include by default', async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await api.apiFetch('/test');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].credentials).toBe('include');
    });

    it('should parse complex JSON response', async () => {
      const mockData = {
        success: true,
        data: { id: 1, name: 'test' },
        nested: { value: 'deep' },
        array: [1, 2, 3],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.apiFetch('/test');

      expect(result).toEqual(mockData);
    });

    it('should handle empty response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await api.apiFetch('/test');

      expect(result).toEqual({});
    });
  });

  describe('apiUpload', () => {
    it('should upload FormData successfully', async () => {
      const mockData = { success: true, fileId: '123' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.mp3');

      const result = await api.apiUpload('/upload', formData);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
      );
    });

    it('should throw error on failed upload 413', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => 'Payload Too Large',
      });

      const formData = new FormData();
      await expect(api.apiUpload('/upload', formData)).rejects.toThrow(
        'Upload /upload failed (413): Payload Too Large'
      );
    });

    it('should throw error on 400 Bad Request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid file format',
      });

      const formData = new FormData();
      await expect(api.apiUpload('/upload', formData)).rejects.toThrow(
        'Upload /upload failed (400): Invalid file format'
      );
    });

    it('should handle upload with multiple files', async () => {
      const mockData = { success: true, filesCount: 3 };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const formData = new FormData();
      formData.append('files', new Blob(['test1']), 'file1.mp3');
      formData.append('files', new Blob(['test2']), 'file2.mp3');
      formData.append('files', new Blob(['test3']), 'file3.mp3');

      const result = await api.apiUpload('/upload-multiple', formData);

      expect(result).toEqual(mockData);
    });

    it('should use credentials include', async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const formData = new FormData();
      await api.apiUpload('/upload', formData);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].credentials).toBe('include');
    });

    it('should parse JSON response from upload', async () => {
      const mockData = {
        success: true,
        data: {
          fileId: '123',
          fileName: 'test.mp3',
          size: 1024,
        },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const formData = new FormData();
      const result = await api.apiUpload('/upload', formData);

      expect(result).toEqual(mockData);
    });

    it('should throw error on 500 during upload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const formData = new FormData();
      await expect(api.apiUpload('/upload', formData)).rejects.toThrow(
        'Upload /upload failed (500): Server error'
      );
    });
  });
});
