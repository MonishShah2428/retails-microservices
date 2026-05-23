package se.magnus.api.event;

import java.time.ZonedDateTime;

public class Event<K,T> {
    public enum Type{
        CREATE, DELETE
    }

    private Event.Type type;
    private K key;
    private T data;
    private ZonedDateTime eventCreatedAt;

    public Event(){
        this.type = null;
        this.key = null;
        this.data = null;
        this.eventCreatedAt = null;
    }

    public Event(Event.Type type, K key, T data) {
        this.type = type;
        this.key = key;
        this.data = data;
        this.eventCreatedAt = ZonedDateTime.now();
    }

    public Type getType(){
        return type;
    }

    public K getKey() {
        return key;
    }
    public T getData() {
        return data;
    }
    public ZonedDateTime getEventCreatedAt() {
        return eventCreatedAt;
    }
}
