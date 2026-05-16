package se.magnus.api.composite.product;

public record ServiceAddresses(String cmp, String pro, String rev, String rec) {
  public ServiceAddresses() {
    this(null, null, null, null);
  }
}
