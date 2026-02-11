(function () {
  function getCloudinaryConfig() {
    return fetch('/admin/config.yml', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        const cloudNameMatch = text.match(/^\s*cloud_name:\s*([^\s#]+)\s*$/m);
        const presetMatch = text.match(/^\s*upload_preset:\s*([^\s#]+)\s*$/m);
        const cloud_name = cloudNameMatch ? cloudNameMatch[1].trim() : '';
        const upload_preset = presetMatch ? presetMatch[1].trim() : '';
        return { cloud_name, upload_preset };
      })
      .catch(() => ({ cloud_name: '', upload_preset: '' }));
  }

  function makeButtonStyle(variant) {
    const base = {
      padding: '10px 12px',
      borderRadius: '12px',
      border: '1px solid rgba(11,45,77,0.18)',
      fontWeight: 800,
      cursor: 'pointer',
    };
    if (variant === 'primary') return { ...base, background: 'rgba(255,255,255,0.92)' };
    return { ...base, background: 'rgba(255,255,255,0.65)' };
  }

  async function uploadToCloudinary({ cloud_name, upload_preset, file, resourceType }) {
    const rt = resourceType === 'video' ? 'video' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud_name)}/${rt}/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', upload_preset);
    const res = await fetch(endpoint, { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Upload failed (${res.status})`);
    }
    const data = await res.json();
    return data.secure_url || data.url || '';
  }

  function isVideoFile(file) {
    if (!file) return false;
    const t = String(file.type || '').toLowerCase();
    if (t.startsWith('video/')) return true;
    const name = String(file.name || '').toLowerCase();
    return name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm');
  }

  function renderPreview(CMS, url) {
    const isVideo = String(url).toLowerCase().includes('/video/upload/') || String(url).toLowerCase().endsWith('.mp4');
    if (!url) return CMS.h('div', { style: { fontSize: '13px', opacity: 0.8 } }, 'No media selected yet.');
    return CMS.h(
      'div',
      { style: { display: 'grid', gap: '8px' } },
      isVideo
        ? CMS.h('video', { src: url, controls: true, style: { width: '100%', borderRadius: '12px' } })
        : CMS.h('img', { src: url, alt: '', style: { width: '100%', borderRadius: '12px' } }),
      CMS.h('div', { style: { fontSize: '12px', opacity: 0.8, wordBreak: 'break-all' } }, url),
    );
  }

  function registerWidgets(CMS, cfg) {
    const SingleControl = CMS.createClass({
      getAccepted: function () {
        // no URL option, just native file picker
        const field = this.props.field;
        const rt = field && field.get ? field.get('resource_type') : null;
        if (rt === 'image') return 'image/*,.heic';
        return 'image/*,video/*,.heic,.mp4,.mov';
      },

      onPick: async function (e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;

        try {
          this.setState({ uploading: true, error: '' });
          const url = await uploadToCloudinary({
            cloud_name: cfg.cloud_name,
            upload_preset: cfg.upload_preset,
            file,
            resourceType: isVideoFile(file) ? 'video' : 'image',
          });
          this.props.onChange(url);
          this.setState({ uploading: false, error: '' });
        } catch (err) {
          this.setState({ uploading: false, error: err?.message || 'Upload failed' });
        }
      },

      handleClear: function () {
        this.props.onChange('');
      },

      render: function () {
        const value = this.props.value || '';
        const uploading = Boolean(this.state && this.state.uploading);
        const error = this.state && this.state.error ? String(this.state.error) : '';

        return CMS.h(
          'div',
          { style: { display: 'grid', gap: '10px' } },
          renderPreview(CMS, value),
          CMS.h(
            'div',
            { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
            CMS.h('input', {
              type: 'file',
              accept: this.getAccepted(),
              onChange: this.onPick,
              disabled: uploading,
            }),
            value
              ? CMS.h(
                  'button',
                  { type: 'button', onClick: this.handleClear, style: makeButtonStyle('ghost'), disabled: uploading },
                  'Remove',
                )
              : null,
            uploading ? CMS.h('span', { style: { fontSize: '13px', opacity: 0.85 } }, 'Uploading…') : null,
          ),
          error ? CMS.h('div', { style: { color: '#b42318', fontSize: '13px', fontWeight: 700 } }, error) : null,
        );
      },
    });

    const MultiControl = CMS.createClass({
      getAccepted: function () {
        return 'image/*,.heic';
      },

      onPickMany: async function (e) {
        const files = Array.from((e.target.files || [])).slice(0, 5);
        e.target.value = '';
        if (files.length === 0) return;

        const current = Array.isArray(this.props.value) ? this.props.value.slice() : [];
        const remaining = Math.max(0, 5 - current.length);
        const toUpload = files.slice(0, remaining);
        if (toUpload.length === 0) return;

        this.setState({ uploading: true, error: '' });
        try {
          const uploaded = [];
          for (const f of toUpload) {
            const url = await uploadToCloudinary({
              cloud_name: cfg.cloud_name,
              upload_preset: cfg.upload_preset,
              file: f,
              resourceType: 'image',
            });
            if (url) uploaded.push(url);
          }
          this.props.onChange([...current, ...uploaded]);
          this.setState({ uploading: false, error: '' });
        } catch (err) {
          this.setState({ uploading: false, error: err?.message || 'Upload failed' });
        }
      },

      removeAt: function (idx) {
        const current = Array.isArray(this.props.value) ? this.props.value.slice() : [];
        current.splice(idx, 1);
        this.props.onChange(current);
      },

      render: function () {
        const value = Array.isArray(this.props.value) ? this.props.value : [];
        const uploading = Boolean(this.state && this.state.uploading);
        const error = this.state && this.state.error ? String(this.state.error) : '';

        return CMS.h(
          'div',
          { style: { display: 'grid', gap: '10px' } },
          CMS.h('div', { style: { fontSize: '13px', opacity: 0.85, fontWeight: 700 } }, `${value.length}/5 photos`),
          value.length
            ? CMS.h(
                'div',
                { style: { display: 'grid', gap: '10px' } },
                value.map((url, idx) =>
                  CMS.h(
                    'div',
                    { key: url, style: { display: 'grid', gap: '8px', border: '1px solid rgba(11,45,77,0.12)', borderRadius: '12px', padding: '10px', background: 'rgba(255,255,255,0.65)' } },
                    CMS.h('img', { src: url, alt: '', style: { width: '100%', borderRadius: '10px' } }),
                    CMS.h(
                      'div',
                      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' } },
                      CMS.h('span', { style: { fontSize: '12px', opacity: 0.8, wordBreak: 'break-all' } }, url),
                      CMS.h(
                        'button',
                        { type: 'button', onClick: () => this.removeAt(idx), style: makeButtonStyle('ghost'), disabled: uploading },
                        'Remove',
                      ),
                    ),
                  ),
                ),
              )
            : CMS.h('div', { style: { fontSize: '13px', opacity: 0.8 } }, 'No extra photos yet.'),
          CMS.h(
            'div',
            { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
            CMS.h('input', {
              type: 'file',
              accept: this.getAccepted(),
              multiple: true,
              onChange: this.onPickMany,
              disabled: uploading || value.length >= 5,
            }),
            uploading ? CMS.h('span', { style: { fontSize: '13px', opacity: 0.85 } }, 'Uploading…') : null,
          ),
          error ? CMS.h('div', { style: { color: '#b42318', fontSize: '13px', fontWeight: 700 } }, error) : null,
        );
      },
    });

    const Preview = CMS.createClass({ render: function () { return CMS.h('span', null, ''); } });
    CMS.registerWidget('cloudinary_media', SingleControl, Preview);
    CMS.registerWidget('cloudinary_gallery', MultiControl, Preview);
  }

  if (!window.CMS) return;

  getCloudinaryConfig().then((cfg) => {
    if (!cfg.cloud_name || !cfg.upload_preset) {
      console.warn('[RedXolo] Missing cloud_name/upload_preset in /admin/config.yml');
      return;
    }
    registerWidgets(window.CMS, cfg);
  });
})();
