const { checkTaskStatus } = require('./aiFastApi.client');

function mapTaskState(status) {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'pending';
}

function buildUpdate(documentField, taskStatus) {
  const update = {
    status: mapTaskState(taskStatus.status),
    progress: typeof taskStatus.progress === 'number' ? taskStatus.progress : 0,
    progressMessage: taskStatus.message || '',
  };

  if (taskStatus.status === 'completed') {
    update[documentField] = Array.isArray(taskStatus.data) ? taskStatus.data : [];
    update.errorDetails = '';
    update.progress = 100;
  }

  if (taskStatus.status === 'failed') {
    update.errorDetails = taskStatus.error || 'Generation failed';
  }

  return update;
}

async function syncGenerationDoc(doc, { documentField }) {
  if (!doc || doc.status !== 'pending' || !doc.taskId) {
    return doc;
  }

  const taskStatus = await checkTaskStatus(doc.taskId);
  const update = buildUpdate(documentField, taskStatus);

  let hasChanges = false;
  for (const [key, value] of Object.entries(update)) {
    if (JSON.stringify(doc[key]) !== JSON.stringify(value)) {
      doc[key] = value;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await doc.save({ validateBeforeSave: false });
  }

  return doc;
}

async function syncGenerationCollection(docs, options) {
  return await Promise.all(
    docs.map(async (doc) => {
      try {
        return await syncGenerationDoc(doc, options);
      } catch (error) {
        console.error(`Failed to sync generation document ${doc?._id}:`, error.message);
        return doc;
      }
    })
  );
}

module.exports = {
  syncGenerationDoc,
  syncGenerationCollection,
};
