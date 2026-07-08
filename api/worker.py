import multiprocessing
multiprocessing.set_start_method('spawn', force=True)
print(f"Default multiprocessing start method: {multiprocessing.get_start_method()}")

from redis import Redis
from rq import Queue, Worker
from rq.job import Job
import os

from worker_tasks import long_running_task, process_data, simple_task


# Queue setup
def get_queue(queue_name: str = "default") -> Queue:
    """Get or create an RQ queue."""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    return Queue(queue_name, connection=redis_conn)


# Example: Enqueuing jobs
def enqueue_example_jobs():
    """Example function showing how to enqueue jobs."""
    queue = get_queue()

    # Enqueue a simple task
    job1 = queue.enqueue(simple_task, "Alice")
    print(f"Enqueued job: {job1.id}")

    # Enqueue a long-running task
    job2 = queue.enqueue(long_running_task, duration=10)
    print(f"Enqueued long task: {job2.id}")

    # Enqueue data processing
    job3 = queue.enqueue(process_data, [1, 2, 3, 4, 5])
    print(f"Enqueued data processing: {job3.id}")

    return [job1, job2, job3]


# Worker setup
def start_worker(queue_names: list[str] = None):
    """Start an RQ worker to process jobs."""
    if queue_names is None:
        queue_names = ["default"]

    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    queues = [Queue(name, connection=redis_conn) for name in queue_names]

    print(f"Starting worker for queues: {queue_names}")
    worker = Worker(queues, connection=redis_conn)
    worker.work()


# Check job status
def check_job_status(job_id: str) -> dict:
    """Check the status of a job by ID."""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    job = Job.fetch(job_id, connection=redis_conn)

    return {
        "job_id": job.id,
        "status": job.get_status(),
        "result": job.result if job.is_finished else None,
        "error": str(job.exc_info) if job.is_failed else None,
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "enqueue":
        # Enqueue example jobs
        print("Enqueuing example jobs...")
        jobs = enqueue_example_jobs()
        print(f"\nEnqueued {len(jobs)} jobs.")
    else:
        # Start worker (default behavior)
        print("=" * 50)
        print("RQ Worker Starting")
        print("=" * 50)
        print("\nListening for jobs on 'default' queue...")
        print("Press Ctrl+C to stop\n")
        try:
            start_worker()
        except KeyboardInterrupt:
            print("\n\nWorker stopped by user")
